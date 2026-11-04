using MySqlConnector;
using System.Text.Json.Nodes;

namespace PedidosService.Services;

public interface IPedidosService
{
    Task CheckDatabaseAsync();

    Task<List<Dictionary<string, object?>>> ObtenerAsync(
        JsonNode user,
        long? id = null
    );

    Task ActualizarEstadoAsync(long id, string estado);
}

public class PedidosService : IPedidosService
{
    // Configura la conexión a MariaDB mediante variables de entorno.
    private MySqlConnection Connection()
    {
        var config = new MySqlConnectionStringBuilder
        {
            Server = Environment.GetEnvironmentVariable("DB_HOST")
                ?? "127.0.0.1",

            Port = uint.Parse(
                Environment.GetEnvironmentVariable("DB_PORT")
                ?? "3306"
            ),

            Database = Environment.GetEnvironmentVariable("DB_NAME")
                ?? "la_cosecha",

            UserID = Environment.GetEnvironmentVariable("DB_USER"),
            Password = Environment.GetEnvironmentVariable("DB_PASSWORD"),
            DateTimeKind = MySqlDateTimeKind.Utc
        };

        return new MySqlConnection(config.ConnectionString);
    }

    // Comprueba la disponibilidad de la base de datos.
    public async Task CheckDatabaseAsync()
    {
        await using var db = Connection();
        await db.OpenAsync();

        await using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT 1";

        await cmd.ExecuteScalarAsync();
    }

    // Consulta los pedidos respetando los permisos del usuario.
    public async Task<List<Dictionary<string, object?>>> ObtenerAsync(
        JsonNode user,
        long? id = null
    )
    {
        await using var db = Connection();
        await db.OpenAsync();

        await using var cmd = db.CreateCommand();

        cmd.CommandText = """
            SELECT
                p.id,
                p.id_cliente,
                p.id_direccion,
                p.id_tipo_pago,
                p.fecha,
                p.estado,
                p.total,
                COALESCE(
                    JSON_UNQUOTE(
                        JSON_EXTRACT(
                            p.cliente_snapshot,
                            '$.nombre'
                        )
                    ),
                    u.nombre
                ) AS nombre
            FROM pedidos AS p
            INNER JOIN clientes AS c
                ON c.id = p.id_cliente
            INNER JOIN usuarios AS u
                ON u.id = c.id_usuario
            WHERE
                (@staff OR p.id_cliente = @client)
                AND (@id IS NULL OR p.id = @id)
            ORDER BY p.id DESC
            LIMIT 500
            """;

        var role = user["rol"]!.GetValue<string>();

        var isStaff = new[]
        {
            "ADMIN",
            "VENTAS",
            "LOGISTICA"
        }.Contains(role);

        cmd.Parameters.AddWithValue("@staff", isStaff);

        cmd.Parameters.AddWithValue(
            "@client",
            user["clienteId"]?.GetValue<long>()
        );

        cmd.Parameters.AddWithValue("@id", id);

        var rows = new List<Dictionary<string, object?>>();

        await using var reader = await cmd.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>();

            for (int i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = reader.IsDBNull(i)
                    ? null
                    : reader.GetValue(i);
            }

            rows.Add(row);
        }

        return rows;
    }

    // Permite iniciar la preparación únicamente de pedidos pagados.
    public async Task ActualizarEstadoAsync(
        long id,
        string estado
    )
    {
        if (estado != "preparacion")
        {
            throw new ArgumentException(
                "Solo puedes pasar un pedido pagado a preparación. " +
                "Pagos y entregas los confirman sus servicios."
            );
        }

        await using var db = Connection();
        await db.OpenAsync();

        await using var cmd = db.CreateCommand();

        cmd.CommandText = """
            UPDATE pedidos
            SET estado = 'preparacion'
            WHERE id = @id
              AND estado = 'pagado'
            """;

        cmd.Parameters.AddWithValue("@id", id);

        var affectedRows = await cmd.ExecuteNonQueryAsync();

        if (affectedRows != 1)
        {
            throw new ArgumentException(
                "El pedido no está pagado o ya fue actualizado"
            );
        }
    }
}

