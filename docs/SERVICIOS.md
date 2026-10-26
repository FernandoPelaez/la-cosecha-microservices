# Servicios, puertos y autoría

La fuente de arranque es `scripts/service-registry.mjs`. Las asignaciones de autor describen la procedencia; **adaptado** no significa ejecutar intacto el repositorio original. Las diferencias contractuales se documentan en [PROCEDENCIA](PROCEDENCIA.md).

| Proceso / puerto | Tecnología | Procedencia y adaptación | Responsabilidad / contrato interno principal |
|---|---|---|---|
| auth / 4001 | Node, Express | Paul; adaptación sustancial de identidad, validaciones y persistencia; recuperación y verificación añadidas | `/login`, `/register`, `/me`, `/profile`, `/recover`, `/reset`, `/verify` |
| inventory / 4002 | Node, Express | Alexander; repositorio y contratos adaptados al esquema canónico | `/products`, `/inventory`, `/stock/:id`, `/offers`, `/movements` |
| commerce / 4003 | Node, Express | Coordinación nueva; aporta módulos ausentes y un único comprobante | `/cart`, `/addresses`, `/checkout`, `/purchases`, `/payments`, `/sales`, `/receipts`, `/webhook` |
| suppliers / 4004 | Python, Flask/Waitress | Servicio de proveedores de Drive, adaptado a identidad y SQL compartidos | `/api/proveedores` |
| returns / 4005 | Node y TypeScript | Fernando, dominio de garantías/devoluciones adaptado de memoria a MySQL y Stripe | `/returns`, `/warranties`, `/returns/:id/refund` |
| packaging / 4006 | Node y TypeScript | Fernando; validaciones de paquete adaptadas de SQLite a MySQL; envasado añadido | `/packages`, `/bottling` |
| reviews / 4007 | Node, Express | Nidian; propiedad, compra previa y permisos añadidos | `/reviews`, `/reviews/product/:id` |
| reports / 4008 | Node, Express | Reportes de inventario y compras de Drive; consultas adaptadas | `/reports/inventory`, `/reports/purchases`, `/dashboard` |
| orders / 4009 | C#, ASP.NET 10 | César; controlador, repositorio y flujo adaptados | `/api/pedidos`, `/api/pedidos/:id`, `/api/pedidos/:id/estado` |
| history / 4010 | Python, FastAPI/Uvicorn | Aranzazu; contrato de consulta, persistencia e identidad desarrolladas para sustituir los libros de muestra | `/history` |
| shipping / 4011 | Python, Flask/Waitress | Logística de Drive + regla de validación de Dasha adaptadas | `/shipping`, `/deliveries/:id` |
| roles / 4012 | Node, Express | `servicio-roles.zip`, actualización de Drive; login duplicado eliminado | `/roles`, `/roles/check`, `/usuarios/:id/rol` |
| stock-alerts / 4013 | C#, ASP.NET 10 | Regla inclusiva de Ángel Alexis; API HTTP desarrollada a partir del material WinForms/documental | `/api/alertas/stock` GET/POST |

Next usa el puerto 3000. El trabajador de correo no escucha HTTP. Todos los procesos disponen de `/live`; `/health` consulta sus dependencias y puede exigir sesión en alertas. Cambiar el puerto de un servicio requiere ajustar la variable `*_PORT` **y** la `*_URL` correspondiente. Proveedores usa el prefijo `OPERATIONS` y alertas `ALERTS`.

No se afirma que «24 archivos» sean 24 microservicios. Drive contiene bibliotecas visuales, archivos repetidos, documentación, simuladores y servicios. La entrega conserva 13 procesos de negocio con tres lenguajes y componentes reutilizables para los requisitos visuales. Las fuentes originales y hashes están en `auditoria/`.

Los 31 puntos académicos no se reducen a 13 requisitos: un proceso puede asumir varias responsabilidades relacionadas sin duplicar entidades. La matriz vincula cada punto por separado. Las compilaciones y pruebas de contratos no sustituyen la demostración HTTP completa, aún pendiente en el entorno local del alumno.
