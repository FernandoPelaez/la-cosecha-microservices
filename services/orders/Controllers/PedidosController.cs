using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Nodes;
using PedidosService.Services;
namespace PedidosService.Controllers;

[ApiController]
[Route("api/pedidos")]
public class PedidosController(IPedidosService service,IHttpClientFactory factory) : ControllerBase {
    private JsonNode UserData => (JsonNode)HttpContext.Items["user"]!;
    [HttpGet] public async Task<IActionResult> ObtenerTodos()=>Ok(new {data=await service.ObtenerAsync(UserData)});
    [HttpGet("{id:long}")] public async Task<IActionResult> ObtenerPorId(long id){var rows=await service.ObtenerAsync(UserData,id);return rows.Count==0?NotFound(new {error=new{message="Pedido no encontrado"}}):Ok(new {data=rows[0]});}
    [HttpPatch("{id:long}/estado")] public async Task<IActionResult> ActualizarEstado(long id,[FromBody] EstadoDto dto){if(!new[]{"ADMIN","VENTAS"}.Contains(UserData["rol"]!.GetValue<string>()))return StatusCode(403,new {error=new{message="No tienes permiso"}});await service.ActualizarEstadoAsync(id,dto.Estado);return Ok(new {data=new{id,estado=dto.Estado}});}
    // Registro coordinado: comercio hace una sola transacción para pedido, líneas y reserva.
    [HttpPost] public async Task<IActionResult> Crear([FromBody] JsonElement dto){var client=factory.CreateClient();client.Timeout=TimeSpan.FromSeconds(30);using var message=new HttpRequestMessage(HttpMethod.Post,(Environment.GetEnvironmentVariable("COMMERCE_URL")??"http://127.0.0.1:4003")+"/checkout");message.Headers.TryAddWithoutValidation("Authorization",Request.Headers.Authorization.ToString());message.Headers.Add("X-Service-Key",Environment.GetEnvironmentVariable("SERVICE_KEY"));message.Headers.Add("X-Correlation-Id",(string)HttpContext.Items["correlation"]!);message.Content=JsonContent.Create(dto);using var response=await client.SendAsync(message);return new ContentResult{StatusCode=(int)response.StatusCode,ContentType="application/json",Content=await response.Content.ReadAsStringAsync()};}
}
public record EstadoDto(string Estado);
