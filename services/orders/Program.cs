using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using PedidosService.Services;

var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("ORDERS_PORT") ?? "4009";

builder.WebHost.UseUrls(
    Environment.GetEnvironmentVariable("ORDERS_BIND")
    ?? $"http://127.0.0.1:{port}"
);

builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);
builder.Services.AddHttpClient();
builder.Services.AddScoped<IPedidosService, PedidosService.Services.PedidosService>();
builder.Services.AddControllers();

var app = builder.Build();

app.Use(async (ctx, next) =>
{
    var incoming = ctx.Request.Headers["X-Correlation-Id"].ToString();
    var correlation = Regex.IsMatch(incoming, "^[a-zA-Z0-9_-]{8,80}$")
        ? incoming
        : Guid.NewGuid().ToString();

    ctx.Response.Headers["X-Correlation-Id"] = correlation;
    ctx.Items["correlation"] = correlation;

    try
    {
        if (ctx.Request.Path == "/live" || ctx.Request.Path == "/health")
        {
            await next();
            return;
        }

        var expected = Environment.GetEnvironmentVariable("SERVICE_KEY") ?? "";
        var received = ctx.Request.Headers["X-Service-Key"].ToString();

        if (
            expected.Length < 48 ||
            !CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(received)
            )
        )
        {
            ctx.Response.StatusCode = 401;
            await ctx.Response.WriteAsJsonAsync(new
            {
                error = new
                {
                    message = "Servicio no autorizado"
                }
            });

            return;
        }

        var client = ctx.RequestServices
            .GetRequiredService<IHttpClientFactory>()
            .CreateClient();

        client.Timeout = TimeSpan.FromSeconds(8);

        var authUrl = Environment.GetEnvironmentVariable("AUTH_URL")
            ?? "http://127.0.0.1:4001";

        using var message = new HttpRequestMessage(
            HttpMethod.Get,
            $"{authUrl.TrimEnd('/')}/me"
        );

        message.Headers.TryAddWithoutValidation(
            "Authorization",
            ctx.Request.Headers.Authorization.ToString()
        );

        message.Headers.Add("X-Service-Key", expected);
        message.Headers.Add("X-Correlation-Id", correlation);

        using var response = await client.SendAsync(
            message,
            ctx.RequestAborted
        );

        if (!response.IsSuccessStatusCode)
        {
            app.Logger.LogWarning(
                "Autenticación respondió {StatusCode}. CorrelationId: {CorrelationId}",
                (int)response.StatusCode,
                correlation
            );

            ctx.Response.StatusCode =
                (int)response.StatusCode is 401 or 403 ? 401 : 503;

            await ctx.Response.WriteAsJsonAsync(new
            {
                error = new
                {
                    message = ctx.Response.StatusCode == 401
                        ? "Inicia sesión para continuar"
                        : "Servicio de identidad temporalmente no disponible"
                }
            });

            return;
        }

        var authData = await response.Content.ReadAsStringAsync();
        ctx.Items["user"] = JsonNode.Parse(authData)!["data"];

        // Validar los permisos del usuario.
        var allowed = HttpMethods.IsPost(ctx.Request.Method)
            ? "rol=CLIENTE"
            : "rol=ADMIN&rol=VENTAS&rol=LOGISTICA&rol=CLIENTE";

        var rolesUrl = Environment.GetEnvironmentVariable("ROLES_URL")
            ?? "http://127.0.0.1:4012";

        using var permission = new HttpRequestMessage(
            HttpMethod.Get,
            $"{rolesUrl.TrimEnd('/')}/roles/check?{allowed}"
        );

        permission.Headers.TryAddWithoutValidation(
            "Authorization",
            ctx.Request.Headers.Authorization.ToString()
        );

        permission.Headers.Add("X-Service-Key", expected);
        permission.Headers.Add("X-Correlation-Id", correlation);

        using var checkedRole = await client.SendAsync(
            permission,
            ctx.RequestAborted
        );

        if (!checkedRole.IsSuccessStatusCode)
        {
            app.Logger.LogWarning(
                "Servicio de roles respondió {StatusCode}. CorrelationId: {CorrelationId}",
                (int)checkedRole.StatusCode,
                correlation
            );

            ctx.Response.StatusCode = (int)checkedRole.StatusCode;
            await ctx.Response.WriteAsync(
                await checkedRole.Content.ReadAsStringAsync()
            );

            return;
        }

        await next();
    }
    catch (ArgumentException error)
    {
        app.Logger.LogWarning(
            error,
            "Solicitud inválida. CorrelationId: {CorrelationId}",
            correlation
        );

        ctx.Response.StatusCode = 409;
        await ctx.Response.WriteAsJsonAsync(new
        {
            error = new
            {
                message = error.Message
            }
        });
    }
    catch (Exception error)
    {
        app.Logger.LogError(
            error,
            "Error en el servicio de pedidos. CorrelationId: {CorrelationId}",
            correlation
        );

        if (!ctx.Response.HasStarted)
        {
            ctx.Response.StatusCode = 503;

            await ctx.Response.WriteAsJsonAsync(new
            {
                error = new
                {
                    message = "Servicio de pedidos temporalmente no disponible"
                }
            });
        }
    }
    finally
    {
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            service = "orders",
            correlationId = correlation,
            status = ctx.Response.StatusCode
        }));
    }
});

app.MapGet("/live", () =>
    Results.Ok(new
    {
        data = new
        {
            service = "orders",
            status = "running"
        }
    })
);

app.MapGet("/health", async (IPedidosService service) =>
{
    await service.CheckDatabaseAsync();

    return Results.Ok(new
    {
        data = new
        {
            service = "orders",
            status = "ok"
        }
    });
});

app.MapControllers();

app.Run();
