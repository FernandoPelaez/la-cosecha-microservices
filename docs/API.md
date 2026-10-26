# Contratos HTTP de la entrega

URL pública local: `http://localhost:3000/api`. Todas las rutas siguientes son relativas a `/api`. El navegador usa cookie de sesión; el BFF agrega `Authorization: Bearer ...`, `X-Service-Key` y `X-Correlation-Id` al proceso interno. Los puertos y prefijos internos están en [SERVICIOS](SERVICIOS.md) y `apps/web/src/lib/services.ts`.

Respuesta normal: `{ "data": ... }`. Error: `{ "error": { "message": "..." } }`. `401` sin identidad, `403` sin permiso/origen permitido, `404` inexistente o ajeno, `409` conflicto de estado/relación, `422` datos inválidos y `503` dependencia no disponible. PDFs y CSV utilizan su Content-Type propio. Las solicitudes de escritura del navegador requieren Origin igual a `APP_URL`; el webhook usa firma Stripe.

## Acceso y roles

| Método y ruta | Entrada principal | Permiso |
|---|---|---|
| POST `auth/register` | nombre, correo, telefono, password, botToken | Pública, antibots |
| POST `auth/login` | correo, password, botToken | Pública, antibots |
| GET `auth/me` | — | Sesión |
| PUT `auth/profile` | nombre, telefono | Propietario |
| POST `auth/logout` | — | Sesión; revoca versión |
| POST `auth/recover` | correo, botToken | Pública; respuesta no revela existencia |
| POST `auth/reset` | token, password | Token de recuperación |
| POST `auth/verify` | token | Token de correo |
| POST `auth/verify/resend` | — | Sesión |
| GET `roles` | — | ADMIN |
| GET `roles/check?rol=ADMIN` | rol repetible | Sesión; comprueba pertenencia |
| GET `users?q=...` | búsqueda opcional | ADMIN |
| GET/PUT `users/:id/rol` | PUT: nombre_rol | GET propio/ADMIN; PUT ADMIN distinto del objetivo |
| POST `users/:id/desbloquear` | — | ADMIN |

Los esquemas definitivos son `services/auth/server.mjs`, `service.mjs` y `services/roles/server.mjs`. Los datos de ejemplo son placeholders, no cuentas de acceso.

## Inventario y proveedores

| Método y ruta | Entrada / efecto | Permiso |
|---|---|---|
| GET `products`, `products/:id` | Catálogo público sin costo/proveedor | Pública |
| GET `inventory`, `movements`, `offers` | Operación y bitácora | ADMIN/INVENTARIO |
| POST `products`, PUT/DELETE `products/:id` | Alta/cambio/baja protegida por relaciones y stock | ADMIN/INVENTARIO |
| POST `stock/:id` | cantidad con signo, motivo | ADMIN/INVENTARIO; ajuste trazado |
| POST `offers`, PUT/DELETE `offers/:id` | nombre, tipo_descuento, valor, fecha_inicio, fecha_fin, activa, productos | ADMIN/INVENTARIO |
| GET/POST `alerts` | POST: id_producto; cantidades se consultan al inventario | ADMIN/INVENTARIO |
| GET/POST `suppliers`, GET/PUT/DELETE `suppliers/:id` | nombre y datos de contacto/fiscales confirmados | ADMIN/INVENTARIO |
| GET `reports/inventory` | `format=csv` opcional | ADMIN/INVENTARIO |

Producto: nombre, descripcion, lote, serie, caducidad, id_proveedor, costo, precio, categoria, stock_minimo, stock_maximo e imagen oficial. Costo/proveedor desconocidos pueden ser nulos. Caducidad `YYYY-MM-DD`; importes decimales como cadenas. El stock se modifica con una operación separada, nunca al editar la ficha. Ofertas aplican el mejor descuento vigente, no se suman entre sí.

## Aprovisionamiento

| Método y ruta | Entrada / salida |
|---|---|
| GET/POST `purchases` | POST: id_proveedor e items con id_producto, cantidad, costo_unitario |
| GET `purchases/:id` | Líneas de la compra |
| PATCH `purchases/:id` | estado: confirmada, recibida o cancelada según transición |
| GET/POST `supplier-returns` | POST: id_compra, id_producto, cantidad, motivo |
| GET `reports/purchases?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` | Compras sin multiplicar totales por detalles; `format=csv` opcional |

Todas requieren ADMIN/INVENTARIO. Recibir una compra incrementa existencias una sola vez; devolver a proveedor resta unidades recibidas disponibles. No son pedidos ni devoluciones de clientes.

## Venta y posventa

| Método y ruta | Entrada / efecto | Permiso |
|---|---|---|
| GET `cart`, PUT `cart/:id` | PUT: cantidad; cero elimina | CLIENTE propio |
| GET/POST `addresses`, PUT/DELETE `addresses/:id` | calle_numero, colonia, ciudad, codigo_postal, referencias | CLIENTE propio |
| GET `payment-methods` | Únicamente tarjeta y disponibilidad configurada | Pública |
| POST `checkout` | id_direccion, id_tipo_pago, key UUID | CLIENTE con correo verificado; pasa por pedidos C# |
| GET `order-result/:id` | Consulta del estado; concilia Stripe si está pendiente | CLIENTE propio |
| POST `retry-payment/:id` | Recupera enlace de Checkout | CLIENTE propio |
| POST `cancel-order/:id` | Solicita expiración y sólo entonces libera reserva | CLIENTE propio |
| POST `webhooks/stripe` | Cuerpo bruto y Stripe-Signature | Firma del proveedor |
| GET `orders`, `orders/:id` | Pedidos canónicos | CLIENTE propio o ADMIN/VENTAS/LOGISTICA |
| PATCH `orders/:id/estado` | estado: preparacion, sólo desde pagado | ADMIN/VENTAS |
| GET `sales`, `payments` | Consultas administrativas, hasta 500 filas recientes | ADMIN/VENTAS |
| GET `history` | Historial con líneas, fotos, pago, envío y total reembolsado | CLIENTE propio |
| GET `receipts/:id`, `receipts/:id/pdf` | `id` es ID de venta | Propietario o ADMIN |
| POST `receipts/:id/email` | Envío SMTP del comprobante canónico | Propietario o ADMIN |
| GET/POST `returns`, `warranties` | POST: id_venta, id_producto, motivo; returns también cantidad | CLIENTE propio o ADMIN |
| PATCH `returns/:id`, `warranties/:id` | Estado y resolución/reintegrar según flujo | ADMIN |
| POST `returns/:id/refund` | Solicitud/consulta de reembolso | ADMIN |
| GET `reviews/product/:id` | Reseñas reales del producto | Pública |
| GET/POST `reviews`, PUT/DELETE `reviews/:id` | calificacion 1–5 entera, comentario; POST id_producto | CLIENTE propietario con compra; ADMIN puede moderar |

La clave UUID del checkout debe mantenerse en reintentos de la misma solicitud. La UI no envía id_cliente, total, costo ni estado de pago. El domicilio usado en un pedido no se edita: registra otro para futuras compras. La instantánea preserva la compra original.

## Logística y envasado

| Método y ruta | Entrada principal | Permiso |
|---|---|---|
| GET/POST `bottling`, PUT `bottling/:id` | id_producto, tipo_envase, capacidad_ml confirmada o null, tipo_tapa, etiqueta_colocada, sello_colocado, cantidad, estado, observaciones | ADMIN/INVENTARIO/LOGISTICA |
| GET/POST `packages` | POST: id_envio y paquete {peso,tamano,tipoEmpacado,medidas:{largo,ancho,alto}} | ADMIN/LOGISTICA/INVENTARIO en servicio; menú de logística |
| GET `shipping`, PATCH `shipping/:id` | estado, paqueteria, num_guia | ADMIN/LOGISTICA |
| GET `deliveries`, POST `deliveries/:id` | destinatario, fecha_entrega_real con zona, firma_evidencia HTTPS; id de envío | ADMIN/LOGISTICA |
| GET `dashboard` | Actividad y pendientes reales | Roles internos |

Peso en kg; dimensiones en cm; tamaño chico/mediano/grande; empaque caja/bolsa. La guía y un paquete preparado son necesarios para despachar. Validar entrega exige que el envío haya salido, fecha no futura y operador autenticado. La URL de evidencia se registra; no se simula una llamada a una paquetería externa.

La administración pagina los conjuntos recuperados, con filtros de texto/estado. Varios endpoints limitan a 500 registros recientes: no se presenta la paginación visual como paginación remota ilimitada.
