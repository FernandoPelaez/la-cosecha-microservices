using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;

using Microsoft.AspNetCore.Mvc;
using PedidosService.Services;

namespace PedidosService.Controllers;

[ApiController]
[Route("api/pedidos")]
public class PedidosController(
    IPedidosService service,
    IHttpClientFactory factory
) : ControllerBase
{
    private JsonNode UserData =>
        (JsonNode)HttpContext.Items["user"]!;

    // Consulta los pedidos disponibles para el usuario.
    [HttpGet]
    public async Task<IActionResult> ObtenerTodos()
    {
        var rows = await service.ObtenerAsync(UserData);

        return Ok(new { data = rows });
    }

    // Obtiene la información de un pedido específico.
    [HttpGet("{id:long}")]
    public async Task<IActionResult> ObtenerPorId(long id)
    {
        var rows = await service.ObtenerAsync(UserData, id);

        if (rows.Count == 0)
        {
            return NotFound(new
            {
                error = new
                {
                    message = "Pedido no encontrado"
                }
            });
        }

        return Ok(new { data = rows[0] });
    }

    // Permite actualizar el estado únicamente a roles autorizados.
    [HttpPatch("{id:long}/estado")]
    public async Task<IActionResult> ActualizarEstado(
        long id,
        [FromBody] EstadoDto dto
    )
    {
        var role = UserData["rol"]!.GetValue<string>();

        if (!new[] { "ADMIN", "VENTAS" }.Contains(role))
        {
            return StatusCode(403, new
            {
                error = new
                {
                    message = "No tienes permiso"
                }
            });
        }

        await service.ActualizarEstadoAsync(id, dto.Estado);

        return Ok(new
        {
            data = new
            {
                id,
                estado = dto.Estado
            }
        });
    }

    // Delega el registro del pedido y la reserva al microservicio de comercio.
    [HttpPost]
    public async Task<IActionResult> Crear(
        [FromBody] JsonElement dto
    )
    {
        var client = factory.CreateClient();

        client.Timeout = TimeSpan.FromSeconds(30);

        var commerceUrl =
            Environment.GetEnvironmentVariable("COMMERCE_URL")
            ?? "http://127.0.0.1:4003";

        using var message = new HttpRequestMessage(
            HttpMethod.Post,
            $"{commerceUrl}/checkout"
        );

        message.Headers.TryAddWithoutValidation(
            "Authorization",
            Request.Headers.Authorization.ToString()
        );

        message.Headers.Add(
            "X-Service-Key",
            Environment.GetEnvironmentVariable("SERVICE_KEY")
        );

        message.Headers.Add(
            "X-Correlation-Id",
            (string)HttpContext.Items["correlation"]!
        );

        message.Content = JsonContent.Create(dto);

        using var response = await client.SendAsync(message);

        return new ContentResult
        {
            StatusCode = (int)response.StatusCode,
            ContentType = "application/json",
            Content = await response.Content.ReadAsStringAsync()
        };
    }
}

public record EstadoDto(string Estado);