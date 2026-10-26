using MySqlConnector;
using System.Text.Json.Nodes;
namespace PedidosService.Services;

public interface IPedidosService {
    Task CheckDatabaseAsync();
    Task<List<Dictionary<string,object?>>> ObtenerAsync(JsonNode user, long? id=null);
    Task ActualizarEstadoAsync(long id,string estado);
}

// Adaptación del servicio de César: esquema real, parámetros y estados coherentes.
public class PedidosService : IPedidosService {
    private MySqlConnection Connection() => new(new MySqlConnectionStringBuilder {
        Server=Environment.GetEnvironmentVariable("DB_HOST") ?? "127.0.0.1",
        Port=uint.Parse(Environment.GetEnvironmentVariable("DB_PORT") ?? "3306"),
        Database=Environment.GetEnvironmentVariable("DB_NAME") ?? "la_cosecha",
        UserID=Environment.GetEnvironmentVariable("DB_USER"), Password=Environment.GetEnvironmentVariable("DB_PASSWORD"),
        DateTimeKind=MySqlDateTimeKind.Utc
    }.ConnectionString);
    public async Task CheckDatabaseAsync() { await using var db=Connection(); await db.OpenAsync(); await using var cmd=db.CreateCommand(); cmd.CommandText="SELECT 1"; await cmd.ExecuteScalarAsync(); }
    public async Task<List<Dictionary<string,object?>>> ObtenerAsync(JsonNode user,long? id=null) {
        await using var db=Connection();await db.OpenAsync();
        await using var cmd=db.CreateCommand();
        cmd.CommandText="SELECT p.id,p.id_cliente,p.id_direccion,p.id_tipo_pago,p.fecha,p.estado,p.total,COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p.cliente_snapshot,'$.nombre')),u.nombre) AS nombre FROM pedidos p JOIN clientes c ON c.id=p.id_cliente JOIN usuarios u ON u.id=c.id_usuario WHERE (@staff OR p.id_cliente=@client) AND (@id IS NULL OR p.id=@id) ORDER BY p.id DESC LIMIT 500";
        var role=user["rol"]!.GetValue<string>();
        cmd.Parameters.AddWithValue("@staff",new[]{"ADMIN","VENTAS","LOGISTICA"}.Contains(role));
        cmd.Parameters.AddWithValue("@client",user["clienteId"]?.GetValue<long>());
        cmd.Parameters.AddWithValue("@id",id);
        await using var reader=await cmd.ExecuteReaderAsync();var rows=new List<Dictionary<string,object?>>();
        while(await reader.ReadAsync()){var row=new Dictionary<string,object?>();for(int i=0;i<reader.FieldCount;i++)row[reader.GetName(i)]=reader.IsDBNull(i)?null:reader.GetValue(i);rows.Add(row);}return rows;
    }
    public async Task ActualizarEstadoAsync(long id,string estado) {
        if(estado!="preparacion")throw new ArgumentException("Solo puedes pasar un pedido pagado a preparación. Pagos y entregas los confirman sus servicios.");
        await using var db=Connection();await db.OpenAsync();await using var cmd=db.CreateCommand();
        cmd.CommandText="UPDATE pedidos SET estado='preparacion' WHERE id=@id AND estado='pagado'";cmd.Parameters.AddWithValue("@id",id);
        if(await cmd.ExecuteNonQueryAsync()!=1)throw new ArgumentException("El pedido no está pagado o ya fue actualizado");
    }
}
