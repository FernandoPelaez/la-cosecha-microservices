# LA COSECHA SOA — punto de continuación

Actualizado: 22 de octubre de 2026, America/Mazatlan. **No reiniciar ni sustituir la arquitectura.** Esta carpeta es la continuación del proyecto recuperado, no otra implementación.

## Conservado y terminado en código

- Fuentes seleccionadas del commit `59723f1aa7ffa5060f51e35babf348ddcb9173a2`; autoría, adaptaciones y descartes en `docs/PROCEDENCIA.md` y `docs/auditoria/`. Drive: 27 elementos auditados. El nuevo servicio de pago en memoria no se usa como cobro real.
- Trece procesos HTTP en Node, Python y C#, con registro central de puertos. Identidad, existencias y pagos tienen una fuente canónica; BFF sin SQL y sin duplicar reglas de negocio.
- Cinco migraciones protegidas, MySQL 8, catálogo oficial de 15 productos sin existencias, proveedores o ventas inventadas. Nunca importar el dump antiguo ni forzar una base ajena.
- Control de acceso, inventario/ofertas, proveedores/compras, carrito/domicilios, pedidos, Stripe test, comprobante/cola SMTP, historial, devoluciones, empaquetado, logística, entregas, roles, alertas C# y administración implementados. La matriz exacta de 31 requisitos identifica archivos, tablas, endpoints y límites de verificación.
- Conservados diseño claro, cortina original de nueve paneles, logo mayor y franja roja. Sin sidebar. Formularios con ejemplos, fotografías oficiales, cuenta sin repetir el saludo del encabezado.
- Instantáneas de cliente/domicilio/productos en pedidos; entregas con destinatario/evidencia/operador. Una recepción/devolución usa la misma transacción de stock canónico.

## Últimos cambios completados después de recuperar

- Cancelación confirma expiración de Stripe antes de liberar reservas; si el pago ganó la carrera, se concilia.
- El retorno del proveedor consulta y aplica el estado verificado del pedido propio. Un parámetro de URL no prueba un pago.
- Los reembolsos recuperan referencia/metadata antes de crear otro; se almacena ID/estado y sólo un resultado exitoso marca reembolsado. Migración `005_reembolsos.sql`.
- Vistas administrativas de ventas y pagos; acción de cancelación de pedido e indicadores de reembolso pendiente/fallido.
- Catorce pruebas Node nuevas y configuración QA aislada con Docker/MySQL. Documentación final de instalación Git Bash, arquitectura, contratos, procedencia, demostración, matriz y pendientes.
- Corregidos a 320 px el solapamiento de marca/controles y el recorte de menús causado por el `clip-path` de entrada. No se reconstruyó el encabezado ni la cortina.

## Evidencia real

- **52/52 pruebas Node**, 0 fallidas/omitidas. Incluyen los últimos cambios con dobles SQL/Stripe explícitos. Lint, tipos y build de producción aprobados.
- **10/10 Python** y dos compilaciones C# Release (0 advertencias/errores) aprobadas en el avance anterior recuperado; no se repitieron esos módulos conservados.
- **MySQL 8.0.46 aceptó los cinco DDL offline**, con 36 tablas de dominio y aserciones de columnas. Inicialización sin red, no una prueba integral por cliente SQL.
- PDF canónico generado con datos de QA y revisado en dos páginas. No corresponde a una venta real.
- Portada de producción inspeccionada en marcos de 320/390/768/1024/1440 px, con anchura útil 15 px menor por la barra vertical; sin desbordamiento horizontal observado. Cortina, franja y apertura del menú móvil comprobadas. No equivale a emulación de dispositivos ni a validación de todas las pantallas.
- La primera vista de desarrollo presentó un error de chunk en el preview. La copia de producción ejecutó sus interacciones. Confirmar desarrollo normal al iniciar el proyecto completo localmente.

Las salidas conservadas están en `docs/evidencias/`; el alcance completo está en `docs/VERIFICACIONES.md`. No describir dobles, una compilación o un `/live` como una venta real validada.

## Pendiente de verificación/configuración en la instalación

1. Migrador y seed por conexión MySQL, repetición/idempotencia y suites `test:integration` y `test:e2e` con los 13 procesos activos. La revisión automática del entorno no permitió iniciar un listener MySQL; no se evadió la restricción.
2. Claves propias de Turnstile, SMTP y Stripe test: registro/recuperación, correo recibido, checkout A–H, webhook auténtico y reembolso. Seguir `docs/CONFIGURACION.md` y `docs/DEMO-SOA.md`.
3. Recorridos visuales privados, teclado/foco, tablas y estados con datos persistidos en los cinco anchos. No hay integración con una paquetería externa definida: el operador registra guía y evidencia.

## Entrega y cómo continuar tras otra interrupción

`scripts/package.py` genera `la-cosecha.zip` con el código, las fotografías, las cinco migraciones, pruebas y documentación. Excluye dependencias, compilaciones, entornos privados y temporales; valida CRC y rutas obligatorias. La evidencia de la revisión final del contenido se registra en `docs/evidencias/empaquetado.json`.

Si se interrumpe otra vez, recuperar primero la entrega más reciente `la-cosecha.zip`; en su ausencia, usar `la-cosecha-soa-checkpoint.zip`. Leer este archivo y `docs/VERIFICACIONES.md`. Continuar sólo los pendientes anteriores, conservando el código y las pruebas ya aprobadas. Nunca atribuir resultados de otra versión a esta carpeta.
