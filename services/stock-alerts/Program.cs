using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using LaCosecha.Alertas;

var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("ALERTS_PORT") ?? "4013";
builder.WebHost.UseUrls(Environment.GetEnvironmentVariable("ALERTS_BIND") ?? $"http://127.0.0.1:{port}");
builder.Services.AddHttpClient("inventory", client => client.Timeout = TimeSpan.FromSeconds(8));
var app = builder.Build();
app.Use(async (ctx, next) => {
    var incoming = ctx.Request.Headers["X-Correlation-Id"].ToString();
    var correlation = Regex.IsMatch(incoming, "^[a-zA-Z0-9_-]{8,80}$") ? incoming : Guid.NewGuid().ToString();
    ctx.Response.Headers["X-Correlation-Id"] = correlation;
    ctx.Items["correlation"] = correlation;
    try { await next(); }
    catch { ctx.Response.StatusCode = 503; await ctx.Response.WriteAsJsonAsync(new { error = new { message = "Servicio de alertas temporalmente no disponible" } }); }
    Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(new { service = "stock-alerts", correlationId = correlation, status = ctx.Response.StatusCode }));
});
app.MapGet("/live", () => Results.Ok(new { data = new { service = "stock-alerts", status = "running" } }));

async Task<IResult> Evaluate(HttpContext ctx, IHttpClientFactory factory, long? selected) {
    var expected = Environment.GetEnvironmentVariable("SERVICE_KEY") ?? "";
    var received = ctx.Request.Headers["X-Service-Key"].ToString();
    if (expected.Length < 48 || !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(received)))
        return Results.Json(new { error = new { message = "Servicio no autorizado" } }, statusCode: 401);
    using var request = new HttpRequestMessage(HttpMethod.Get, (Environment.GetEnvironmentVariable("INVENTORY_URL") ?? "http://127.0.0.1:4002") + "/inventory");
    request.Headers.Add("X-Service-Key", expected);
    request.Headers.Add("X-Correlation-Id", (string)ctx.Items["correlation"]!);
    request.Headers.TryAddWithoutValidation("Authorization", ctx.Request.Headers.Authorization.ToString());
    using var response = await factory.CreateClient("inventory").SendAsync(request, ctx.RequestAborted);
    if (!response.IsSuccessStatusCode) return Results.Content(await response.Content.ReadAsStringAsync(), "application/json", statusCode: (int)response.StatusCode);
    var rows = JsonNode.Parse(await response.Content.ReadAsStringAsync())!["data"]!.AsArray();
    var alerts = new List<object>();
    foreach (var row in rows) {
        var productId = row!["id"]!.GetValue<long>();
        if (selected.HasValue && selected != productId) continue;
        var actual = row["stock_actual"]!.GetValue<int>();
        var minimum = row["stock_minimo"]!.GetValue<int>();
        var maximum = row["stock_maximo"]!.GetValue<int>();
        var state = AlertaStockService.Estado(actual, minimum, maximum);
        if (state != "Normal" || selected.HasValue) alerts.Add(new {
            id = productId, nombre = row["nombre"]!.GetValue<string>(), stock_actual = actual,
            stock_minimo = minimum, stock_maximo = maximum, alerta = state, evaluado_en = DateTimeOffset.UtcNow
        });
    }
    if (selected.HasValue && alerts.Count == 0) return Results.NotFound(new { error = new { message = "Producto no encontrado" } });
    return Results.Ok(new { data = alerts });
}
app.MapGet("/api/alertas/stock", (HttpContext ctx, IHttpClientFactory factory) => Evaluate(ctx, factory, null));
app.MapPost("/api/alertas/stock", (HttpContext ctx, IHttpClientFactory factory, StockRequest body) => Evaluate(ctx, factory, body.IdProducto));
app.MapGet("/health", (HttpContext ctx, IHttpClientFactory factory) => Evaluate(ctx, factory, null));
app.Run();
public record StockRequest([property: JsonPropertyName("id_producto")] long IdProducto);
