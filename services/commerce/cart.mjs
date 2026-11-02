import { query, transaction } from "../../packages/core/db.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { discounted, decimal } from "../../packages/core/money.mjs";

export async function openCart(c, clientId) {
  ensure(clientId, 403, "Se requiere una cuenta de cliente");

  await query("SELECT id FROM clientes WHERE id=? FOR UPDATE", [clientId], c);

  const [cart] = await query(
    "SELECT id FROM carrito WHERE id_cliente=? AND estado='abierto' ORDER BY id DESC LIMIT 1",
    [clientId],
    c,
  );

  return (
    cart?.id ||
    (await query("INSERT INTO carrito(id_cliente) VALUES (?)", [clientId], c))
      .insertId
  );
}

export async function cartLines(c, cartId) {
  const lines = await query(
    `SELECT d.id_producto,d.cantidad,p.nombre,p.precio,p.activo,p.caducidad,s.stock_actual,(SELECT url_imagen FROM imagenes_producto WHERE id_producto=p.id ORDER BY orden LIMIT 1) AS imagen FROM detalle_carrito d JOIN productos p ON p.id=d.id_producto JOIN stock s ON s.id_producto=p.id WHERE d.id_carrito=? ORDER BY p.id`,
    [cartId],
    c,
  );

  const offers = await query(
    "SELECT pp.id_producto,p.* FROM promociones p JOIN promociones_productos pp ON pp.id_promocion=p.id WHERE p.activa=TRUE AND UTC_TIMESTAMP() BETWEEN p.fecha_inicio AND p.fecha_fin",
    [],
    c,
  );

  return lines.map((l) => ({
    ...l,
    precio_final: decimal(
      discounted(
        l.precio,
        offers.filter((p) => p.id_producto === l.id_producto),
      ),
    ),
  }));
}

export async function getCart(clientId) {
  return transaction(async (c) => {
    const id = await openCart(c, clientId);

    return {
      id,
      items: await cartLines(c, id),
    };
  });
}

export async function setCartItem(clientId, productId, quantity) {
  return transaction(async (c) => {
    const cartId = await openCart(c, clientId);

    if (quantity === 0) {
      await query(
        "DELETE FROM detalle_carrito WHERE id_carrito=? AND id_producto=?",
        [cartId, productId],
        c,
      );
    } else {
      const [p] = await query(
        "SELECT p.activo,p.caducidad,s.stock_actual FROM productos p JOIN stock s ON s.id_producto=p.id WHERE p.id=? FOR UPDATE",
        [productId],
        c,
      );

      ensure(
        p &&
          p.activo &&
          (!p.caducidad ||
            p.caducidad >= new Date().toISOString().slice(0, 10)),
        409,
        "Producto no disponible",
      );

      ensure(
        quantity <= p.stock_actual,
        409,
        "La cantidad supera las existencias",
      );

      await query(
        "INSERT INTO detalle_carrito(id_carrito,id_producto,cantidad) VALUES (?,?,?) ON DUPLICATE KEY UPDATE cantidad=VALUES(cantidad)",
        [cartId, productId, quantity],
        c,
      );
    }

    return {
      id: cartId,
      items: await cartLines(c, cartId),
    };
  });
}