# Procedencia, adaptaciones y descartes

Recursos auditados en las sesiones del 21 y 22 de octubre de 2026. Se conserva el inventario de 27 elementos de Drive en `auditoria/drive-20261022.json`, los repositorios/commits en `auditoria/repositorios.json`, y los 117 archivos seleccionados del avance anterior con sus hashes de origen en `auditoria/reutilizacion.json`. Esos hashes identifican la fuente antes de adaptarla; no son hashes de integridad del código final.

Referencia visual/código V1: [FernandoPelaez/la-cosecha](https://github.com/FernandoPelaez/la-cosecha), commit `59723f1aa7ffa5060f51e35babf348ddcb9173a2`. Se conserva su secuencia GSAP de nueve paneles, las dos frases y la franja roja. V2 aporta la dirección visual clara/editorial y recursos funcionales seleccionados. No se incluyen ambas aplicaciones completas ni sus dependencias.

## Fuentes de servicios

| Fuente | Decisión y adaptación real |
|---|---|
| [Paul · login](https://github.com/paulroddz100/microservicio_login) | Adaptación sustancial Node: identidad única, esquema real, verificación de correo/teléfono, sesión revocable, recuperación y Turnstile. No se mantiene otro login de roles. |
| [Alexander · inventario](https://github.com/AlexanderHHZ/inventario-service) | Se conserva Node; repositorio/contratos adaptados a productos + stock + imágenes y permisos. Se elimina cualquier implementación alternativa activa de stock. |
| [César · pedidos](https://github.com/CesarKarass/RegistroPedidosService) | Proceso ASP.NET C# mantenido. Identidad/roles consultados por HTTP; coordinación de pago/reserva en commerce. No se aceptan id_cliente ni totales del cliente. |
| [Aranzazu · historial](https://github.com/Aranzazu-Acosta-Medina987/microservicio-historial-compras) | FastAPI mantenido; se reemplazaron libros y respuestas constantes por consultas MySQL autorizadas. Es desarrollo nuevo sobre la intención contractual, no reutilización de un repositorio persistente que no existía. |
| [Fernando · empaquetado](https://github.com/FernandoPelaez/empaquetado-service) | Esquemas TypeScript y reglas adaptados; SQLite sustituido por MySQL. Se añadió vínculo con envío. El envasado de salsa es módulo nuevo distinto. |
| [Fernando · garantías/devoluciones](https://github.com/FernandoPelaez/garantias-devoluciones) | Reglas/capacidad y estados adaptados al español y esquema común; memoria/demo sustituidas por MySQL, transacciones y Stripe para reembolsos. |
| [Nidian · reseñas](https://github.com/nididev/comentarios-resenas-service) | Node/MySQL adaptado con propiedad, validación y compra previa. No se aceptan clientes arbitrarios del body. |
| [Dasha · validación](https://github.com/dasharobles/microservicio-validacion-entregas) | Regla `determinar_estado` adaptada en Python dentro de shipping. No se ejecuta su servidor original FastAPI ni se conserva un simulador de paquetería. |
| [Maik · biblioteca de menú](https://github.com/Maik-Vol2/biblioteca-menu) | Referencia de componente, no API HTTP. Navegación reimplementada en React para accesibilidad/responsive y restricción sin sidebar. No se afirma consumo de un microservicio remoto. |
| Proveedores Python de Drive | Flask preservado; SQL canónico, permisos por auth HTTP, errores normalizados y Waitress. |
| Logística Python de Drive | Flask preservado; transiciones, guía, vínculo con venta/paquete y entrega real registrada por operador. |
| Reportes de inventario/compras de Drive | Contratos adaptados en reports Node; esquema, dinero, CSV y llamada HTTP a alertas. No se mantienen copias de productos/ventas. |
| Ángel Alexis · PDF de stock mínimo | La regla `actual <= mínimo` se implementa en C# como servicio HTTP que consulta inventario. El material original WinForms/documental no era un microservicio web ya integrado. |
| `servicio-roles.zip`, actualización 22/10 | Adaptado como proceso de roles separado que utiliza auth; eliminado su proveedor de login duplicado. |

## Recursos alternativos o incompatibles

| Recurso | Decisión |
|---|---|
| `DEVOLUCIONES MATA.rar` / Ramón | Excluido por instrucción explícita; no se incorpora ni se ejecuta. |
| Empaquetado de Alexis | Coincidía en negocio con Fernando; sólo una implementación de empaquetado seleccionada. |
| `serviciopago.zip`, añadido 22/10 | FastAPI con memoria/Luhn/aprobación simulada. Auditado, **no** presentado como pasarela real ni activado en paralelo a Stripe. |
| `servicio-verificacion-rol.zip` | Su login/identidad alternativos se descartan; no crean un segundo catálogo de usuarios. |
| `soa-agregar-producto.zip` y CRUD alternativos | Solapamiento de inventario; reglas útiles se adaptan al único inventory. «Agregar al carrito» no se confunde con alta de producto. |
| Stock máximo/ofertas | Regla adaptada al saldo/promociones canónicos; sin servicio escritor paralelo. |
| Domicilio y ticket heredados | Adaptación funcional dentro de commerce; un domicilio propio y un generador PDF canónico. No hay otra base/ticket duplicado. |
| Encabezado, pie, fondo y menú de Drive | Aportes de interfaz evaluados como componentes/referencia. No se cuentan artificialmente como servidores HTTP. |
| `Parcial_1.zip` y copias de proyectos | Referencia; no se añaden sus aplicaciones completas o datos de demostración a la entrega. |

Hashes de las actualizaciones auditadas: `serviciopago.zip` SHA-256 `05b2fc7950b98cac035a6c29e59d06eeac999138ed55998fdd4377ba9b4be7cf`; `servicio-roles.zip` `27379bc388a169b0c59c40f26369423e4eff4084c3f4c9734138139594e1f1f7`; PDF de Ángel `ab72cdcdf882b44d22d70c5e31a34d0fb4898f9ff0cbbae1d37c75720016f355`.

Los logos/fotos y los 15 nombres/precios proceden de los recursos suministrados. No se inventaron ingredientes, capacidad, costos, proveedores, stock, opiniones, tiempos/costos de envío ni condiciones de garantía. Los contratos originales se conservan como evidencia en `auditoria/CONTRATOS-ORIGINALES.md`; los contratos ejecutables de esta entrega son los de `API.md` y el código, no todos los alias heredados.

## Trabajo nuevo de integración

BFF, sesión común, transacciones de coordinación, compras/devoluciones a proveedor, stock canónico, comprobante/cola, Turnstile, instantáneas, roles auditados, alertas HTTP C#, conciliación/cancelación/reembolso Stripe y la interfaz adaptada se realizaron para esta entrega. No se atribuye ese trabajo adicional a los compañeros ni se afirma que sus proyectos originales ya ofrecieran estas garantías.

Esta procedencia acredita decisiones de código, no pruebas externas. La interoperabilidad completa se demuestra con los servicios ejecutándose y MySQL; el estado verificable está en `VERIFICACIONES.md`.
