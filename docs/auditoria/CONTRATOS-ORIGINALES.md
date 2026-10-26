# Contratos heredados y adaptación propuesta

Los siguientes contratos proceden del código revisado el 21/10/2026. Son contratos **de las fuentes**, no una afirmación de que el proyecto reconstruido exponga todos estos alias. Los endpoints finales de LA COSECHA deben documentarse junto a sus rutas reales.

## Inventario — Alexander

Origen: `src/routes/producto.routes.js`, `src/controllers/producto.controller.js`, `src/services/producto.service.js` y `src/app.js`.

| Método y ruta | Entrada | Comportamiento |
|---|---|---|
| GET `/api/productos` | Sin filtros | Lista completa de productos. |
| GET `/api/productos/:id` | Entero positivo | Un producto o 404. |
| POST `/api/productos` | `nombre`, `costo`, `precio`; opcionales `lote`, `serie`, `caducidad`, `id_proveedor` | Inserta producto; comprueba proveedor cuando se especifica. |
| PUT `/api/productos/:id` | Mismos campos completos | Actualiza; no es actualización parcial. |
| DELETE `/api/productos/:id` | ID | Borrado físico; las relaciones pueden impedirlo. |
| GET `/api/health` | — | Estado del proceso, no prueba una consulta a MySQL. |

Respuesta de negocio usa envoltorio `success`, `message` y, según operación, `data`. El repositorio maneja productos, no reserva inventario ni confirma ventas. En la reconstrucción, los precios se manejan en centavos/DECIMAL; las rutas administrativas verifican el rol y no exponen costo o proveedor en el DTO público. Mantener una sola fila de stock por producto y un historial de movimientos. Una adaptación del contrato puede mapear nombres de campo; no implica conservar un segundo servicio escritor.

## Reporte de inventario — Drive

Origen: `Inventario/Inventario/src/app.js`, `routes/report.routes.js`, `services/report.service.js`, `repositories/inventory.repository.js`.

- GET `/api/v1/reportes/inventario?categoriaId=1&stockBajo=true`.
- Filtros opcionales: `categoriaId` entero positivo y `stockBajo` igual a `true` o `false`; se rechazan campos desconocidos.
- GET `/health` ejecuta `SELECT 1`.
- Respuesta: `{data:{generadoEn,filtros,resumen,productos}}`. Resumen incluye `totalProductos`, `totalUnidades`, `valorInventario`, `productosStockBajo`, `productosSinStock`.
- Lee `productos.stock`, `productos.stock_minimo`, `productos.precio_unitario` y `categorias`. No es directamente compatible con un modelo separado de existencias. Adaptar el repositorio a la tabla de stock canónica o a una vista de sólo lectura. El cálculo usa BigInt y el mínimo inclusivo `stock <= stock_minimo`; estas reglas se pueden implementar de nuevo y probar contra datos canónicos.

## Autenticación — Paul

Prefijo configurable `API_PREFIX`, por defecto `/api/v1` (`src/config/entorno.js`).

| Método y ruta por defecto | Entrada / salida |
|---|---|
| POST `/api/v1/auth/login` | `{nombreUsuario,contrasena}` → `datos` con identidad, rol, `token`, `tipoToken: Bearer`, `expiraEn`. |
| POST `/api/v1/auth/registro` | `{nombreUsuario,contrasena,email?,nombreCompleto?}` → nueva identidad CLIENTE y sesión. |
| GET `/api/v1/auth/verificar` | Requiere Bearer; devuelve identidad de las claims. |
| GET `/api/v1/auth/perfil` | Requiere Bearer; devuelve datos de las claims. |
| GET `/api/v1/auth/admin/panel` | Bearer con rol ADMIN. |
| GET `/api/v1/estado` y `/api/v1/salud` | Estado y comprobación de conexión. |

El registro original no recibe teléfono, y email/nombre completo son opcionales. No se observan endpoints de recuperación o logout. La autenticación tiene bcrypt, hash señuelo, rate limiting y bloqueo temporal. El middleware comprueba el rol del JWT, pero un cambio posterior de permisos necesita revocación/consulta de estado de sesión. En LA COSECHA deben existir identidad y sesión únicas; no combinar este login con `servicio-verificacion-rol`.

El servicio alternativo de roles monta POST `/auth/login` (`correo`, `password`), GET `/auth/verificar-rol` y GET `/auth/solo-admin`. Su modelo Prisma de usuarios/roles y sus claims son diferentes. Se descarta como segundo proveedor de identidad; se retiene únicamente el concepto de middleware de permisos.

## Pedidos de clientes — César

Origen: `Controllers/PedidosController.cs`, `DTOs/Pedidodto.cs`, `Data/IPedidosService.cs`.

| Método y ruta | Contrato |
|---|---|
| POST `/api/Pedidos` | DTO con `IdCarrito`, `IdCliente`, `IdDireccion`, `IdTipoPago` y `IdTarjeta?`; inicia en `Pendiente`. |
| GET `/api/Pedidos` | Todos los pedidos, ordenados por fecha descendente. |
| GET `/api/Pedidos/{id}` | Pedido por ID. |
| PATCH `/api/Pedidos/{id}/estado` | DTO `{Estado}`; acepta `Pendiente`, `Confirmado`, `Cancelado`. |

Los nombres anteriores son las propiedades C#; la serialización web de ASP.NET usa su configuración de JSON. No hay verificación de propiedad del cliente ni matriz de transiciones: aceptar un valor enumerado no impide pasar de cancelado a confirmado. No conserva instantáneas de líneas/precios ni integra Stripe. La adaptación correcta debe tomar identidad y carrito del contexto autenticado, validar dirección, congelar líneas/importes, reservar stock y confirmar sólo por pago verificado. Las órdenes a proveedores deben tener su propio contrato y tablas.

## Proveedores — Flask en Drive

Origen: carpeta `servicio_proveedores_python_mysql_json/servicio_proveedores`, archivos `app.py`, `schema.sql`, `requirements.txt`.

- GET/POST `/api/proveedores`.
- GET/PUT/DELETE `/api/proveedores/<int:id>`.
- GET `/api/health`.
- POST exige `nombre`, `razon_social`, `rfc`, `direccion`, `correo`, `telefono`; PUT permite subconjunto.
- Respuesta con `success`, `data` y mensajes; 409 para RFC duplicado o borrado con compras.
- SQL parametrizado; UPDATE construye nombres de columnas sólo desde lista blanca.
- Dependencias declaradas: Flask 3.1.2, mysql-connector-python 9.4.0, python-dotenv 1.1.1.

Puede mantenerse como proceso Flask interno si se le adapta la persistencia, se elimina debug, se agregan permisos o autenticación interna y se convierte en único escritor de proveedores. Si la nueva arquitectura lo reimplementa como módulo, registrar **compatibilidad contractual**, no afirmar que el proceso Flask se ejecuta. No copiar `CREATE DATABASE tienda` ni asumir mayúsculas de tablas, porque MySQL en Linux puede distinguirlas.

## Compras: reporte y devoluciones de proveedor

El reporte Drive expone GET `/api/v1/reportes/compras`, `/api/v1/reportes/compras/resumen`, `/api/v1/reportes/compras/:id` y `/api/v1/salud`.

Filtros: `desde`, `hasta` (YYYY-MM-DD) y `proveedorId`; listado añade `pagina` (1 por defecto) y `limite` (20 por defecto, máximo 100). Salida de lista `{ok,moneda:"MXN",filtros,datos,paginacion}`; resumen con `totalCompras`, `totalGastado`, `promedioPorCompra`. Repositorio usa una vista que devuelve una fila por compra y evita multiplicar totales al unir detalles. La tabla original usa `compras.proveedor_id`, `detalle_compras.compra_id` y `producto_id`; adaptar los nombres al modelo real.

No se seleccionó un servicio existente de órdenes/devoluciones a proveedor: el pedido de César es de clientes, `soa-agregar-producto` es inventario y el RAR de devoluciones se descarta. Estos procesos necesitan implementación explícita en el dominio de aprovisionamiento. Una devolución de proveedor descuenta sólo unidades recibidas que aún pueden devolverse; no debe utilizar el proceso de posventa de clientes ni generar un reembolso Stripe de cliente.

## Reseñas — Nidian

GET/POST `/api/resenas`; GET/PUT/DELETE `/api/resenas/:id`.

- POST: `{id_producto,id_cliente,calificacion,comentario}`.
- PUT: `{calificacion,comentario}`.
- GET devuelve filas de MySQL directamente; lista por `fecha DESC`.
- El código sólo exige campos y rango 1–5; no valida que calificación sea entera ni vincula `id_cliente` a una sesión.

La reconstrucción deriva el cliente del servidor, valida enteros/longitud, evita modificación de reseñas ajenas y restringe moderación por rol. No se debe dejar el CRUD original públicamente expuesto detrás de una interfaz que oculta botones.

## Historial — Aranzazu

GET `/api/historial-compras/{usuario_id}` devuelve `{usuario_id,total_compras:6,compras:[...]}`; cada compra usa `id_transaccion`, `fecha`, `total`, `estado`, `productos`, y cada producto usa `titulo`, `autor`, `precio`, `cantidad`. GET `/vista` sirve el HTML de muestra.

No hay base de datos ni identidad autorizada; el parámetro sólo se refleja en la respuesta. No adaptar libros a salsas renombrando datos. Construir la respuesta desde pedidos reales del usuario autenticado y datos congelados al comprar. Mantener separado estado de pedido, pago, envío y reembolso.

## Empaquetado — Fernando seleccionado

Origen: `api/src/modules/empaquetados/{routes,schemas,service,repository}.ts`; persistencia original en `node:sqlite`.

| Método y ruta | Contrato |
|---|---|
| POST `/api/v1/empaquetados` | `{peso,tamano,medidas:{largo,ancho,alto},tipoEmpacado}`. Peso en kg y medidas en cm, positivos; `tamano` chico/mediano/grande; `tipoEmpacado` caja/bolsa. |
| GET `/api/v1/empaquetados` | Filtros `q`, `tamano`, `tipoEmpacado`, `page`, `limit` (máx. 100), `sortBy` createdAt/peso/id y `order`. |
| GET `/api/v1/empaquetados/:id` | `{success:true,data}`. |
| PATCH `/api/v1/empaquetados/:id` | Campos parciales; opcional `X-Expected-Updated-At` para conflicto 409. |
| DELETE `/api/v1/empaquetados/:id` | 204; mismo encabezado opcional de versión. |

El registro contiene `id`, `createdAt`, `updatedAt`; listado agrega `meta:{total,page,limit,totalPages,summary:{cajas,bolsas,pesoTotal}}`. Este contrato **no** incluye producto, envase, tapa, etiqueta, sello, capacidad, cantidad, envío o estado de preparación. Para LA COSECHA, es una referencia exclusivamente logística. El dominio nuevo agrega relación y estado de envío; el empaquetado de producto es proceso separado. No simular la segunda responsabilidad metiendo campos arbitrarios en el mismo JSON sin restricciones.

Fernando/Alexis contienen código de negocio idéntico, por lo que se selecciona sólo Fernando. La adaptación a MySQL debe reemplazar SQL SQLite, preservar validaciones y concurrencia y usar un único registro por paquete. No se incluye el frontend heredado ni SQLite como una segunda fuente de verdad.

## Garantías y devoluciones — Fernando

Origen: `src/application`, `src/domain` y `src/http/routes`.

| Método y ruta | Entrada |
|---|---|
| POST `/api/v1/returns` | `{saleId,productId,quantity,reason}`. |
| GET `/api/v1/returns` y `/:id` | Lista o registro. |
| PATCH `/api/v1/returns/:id/status` | `{status}`. |
| POST `/api/v1/warranties` | `{saleId,productId,reason}`; no lleva cantidad. |
| GET `/api/v1/warranties` y `/:id` | Lista o registro. |
| PATCH `/api/v1/warranties/:id/status` | `{status,resolution?}`. |

Estados: `PENDING → APPROVED` o `REJECTED`; `APPROVED → COMPLETED`; no otras transiciones. Completar garantía requiere resolución. Devoluciones pendientes/aprobadas/completadas consumen cantidad; rechazadas liberan capacidad. Se comprueba que el producto pertenece a la venta; garantías no permiten otra activa para la misma pareja.

Las interfaces `UnitOfWork`, `SaleRepository`, `ReturnRepository`, `WarrantyRepository` son puntos de extensión reales. Actualmente `buildApp` inyecta por defecto `InMemoryUnitOfWork(demoData)`. Una adaptación profesional debe inyectar persistencia MySQL, añadir identidad/permisos y usar transacciones con bloqueo para acumulación concurrente. Las rutas originales no traen autorización y listan todos los registros. No hay integración de reembolso Stripe: una resolución comercial no significa devolución de dinero confirmada.

## Envíos y validación de entrega

Flask de logística expone rutas de **HTML/formularios**: GET `/envios`, GET/POST `/envios/nuevo`, POST `/envios/<id>/estado`, POST `/envios/<id>/entregar`, GET `/envios/buscar?guia=...`. Crear recibe `id_venta`, `id_direccion`, `num_guia`, `estado` y responde con redirecciones/mensajes flash. El método de entregar bloquea envío y escribe validación/estado en la misma transacción. Ese código necesita adaptar entradas/salidas a JSON, comprobar pago, autorizar rol y validar transiciones completas.

Dasha expone POST `/validaciones/entrega` con `{id_envio}`; respuesta `{id_validacion_entrega,id_envio,fecha_entrega,estado}`. Usa `validaciones_entrega` con envío único, pero sin FK declarada en el modelo revisado. Consulta un simulador de paquetería y considera válida la combinación de estado entregado y fecha. Eliminar la dependencia de ese simulador en el flujo final, registrar evidencia/autorización y dejar un solo propietario de entrega.

## Tickets y correo

- FastAPI tickets: POST `/api/v1/tickets/generate/{id_venta}` → PDF, 201. Consulta venta y detalles, inserta comprobante y después genera PDF. Hay 409 cuando encuentra un comprobante previo, lo que impide una descarga repetida normal; el modelo carece de unicidad de `id_venta`.
- Flask comprobante: POST `/comprobante/enviar/<id_venta>` genera PDF y llama SMTP; GET `/comprobante/preview/<id_venta>` devuelve JSON. Supone tablas/columnas diferentes y `calcular_totales` añade IVA fijo 16%; no se puede reutilizar ese cálculo para precios de LA COSECHA sin definición comercial.

Propuesta: una sola representación inmutable de la venta, un único folio con restricción de unicidad, PDF descargable repetidamente y una cola/outbox de correo que use el mismo documento. Registrar respuesta SMTP y reintentos sin inventar un envío exitoso. La reconstrucción puede implementar estos componentes en su propio servicio; documentar si es reimplementación y no asegurar que ambos procesos Python se integraron.

## Piezas visuales y descartes

`TiendaHeader`, `AppFooter` y `crearMenu(configuracion)` son componentes/biblioteca de UI. El fondo ASP.NET (`/api/background`, `/{page}`, `/id/{id}`) es almacenamiento en memoria de una configuración visual. Su integración apropiada no crea APIs nuevas ni credenciales: navegación declarativa y tokens de diseño de marca.

`domicilio.zip` sólo usa localStorage. `soa-agregar-producto.zip` inserta producto y STOCK, no líneas de carrito. `StockOfertasApi` calcula descuentos de 10/20% usando stock y precio recibidos del cliente; no debe habilitar promociones automáticas. El archivo de devoluciones con ruta DEVOLUCIONES-SOA se mantiene descartado.

Estas propuestas deben quedar reflejadas en la matriz final como evidencia de auditoría y decisiones; los resultados funcionales de la nueva aplicación se acreditan únicamente con sus pruebas reales.
