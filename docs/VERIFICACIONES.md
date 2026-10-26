# Verificaciones y límites reales

Fecha de cierre técnico: 22 de octubre de 2026, zona America/Mazatlan. Los resultados no se trasladan de otra aplicación: corresponden al proyecto `la-cosecha-soa` recuperado. Después del reinicio se conservaron los resultados aprobados de Python/C# sin repetirlos innecesariamente.

## Ejecutado

| Verificación | Resultado y alcance |
|---|---|
| `npm ci` | Aprobado tras recuperar el checkpoint; 287 paquetes instalados con lock. |
| `npm test` | **52/52 aprobadas**, 0 fallidas, 0 omitidas. Incluye dinero, permisos, revocación, antibots, BFF, errores HTTP, transacciones, idempotencia, cancelación concurrente, retorno de Stripe, reembolsos y correo. MySQL/Stripe/SMTP son dobles donde se indica. |
| `npm run lint` | Aprobado sin errores. |
| `npm run typecheck` | Aprobado para frontend y servicios TypeScript. |
| `npm run build` | Compilación Next de producción aprobada. |
| Python | 10/10 pruebas aprobadas en el avance anterior recuperado; reglas y manejo de errores con adaptadores simulados. Código Python conservado. |
| C# | Pedidos y alertas compilaron Release con SDK .NET 10.0.100, 0 advertencias y 0 errores en el avance recuperado. No equivale a flujo HTTP probado. |
| MySQL 8.0.46 | Las cinco migraciones DDL fueron aceptadas durante `mysqld --initialize-insecure --skip-networking`, en un directorio desechable. Se crearon 36 tablas de dominio y una tabla de aserción que comprobó columnas nuevas. Sin listener, sin datos del usuario. |
| Protección de migraciones | Pruebas unitarias de base ajena, nombre de esquema y checksum aprobadas. El migrador por conexión TCP y su recuperación ante corte siguen pendientes. |
| PDF del comprobante | Generador canónico ejecutado con una compra de prueba explícita: seis productos, dos páginas y total de $784 MXN. Ambas páginas se renderizaron e inspeccionaron: logo, folio, fotografías, desglose y total. No representa una venta ni un pago real. |
| Portada de producción | Cortina y franja animadas observadas; encabezado y composición revisados en marcos de 320, 390, 768, 1024 y 1440 px. Menú móvil abierto y visible después de corregir el recorte del encabezado. Alcance limitado, detallado abajo. |

## Pendiente de ejecutar con dependencias

| Prueba | Recurso necesario | Cómo cerrar |
|---|---|---|
| Migraciones y seed por cliente MySQL | MySQL 8 activo y usuario local | `db:migrate`, `db:seed`, repetir y comprobar idempotencia/contadores. |
| Integración y concurrencia SQL | Docker QA o MySQL aislado permitido en puerto 33306 | Comandos de la sección siguiente; verificar stock y unicidad. |
| Flujo HTTP de los 13 procesos | Node, Python, .NET, MySQL activos | `dev:services:test` y `test:e2e`. |
| Registro/login/recuperación | Turnstile y SMTP configurados | Registro y correo reales de prueba; token usado/vencido, login inválido, bloqueo y revocación. |
| Checkout A–H y reembolso | Claves Stripe test y CLI/webhook | Guion `DEMO-SOA.md`; evidenciar cada resultado en Stripe y MySQL. |
| Entrega de correo al buzón | SMTP y buzón de prueba | Confirmar recepción; la aplicación sólo certifica aceptación SMTP. |
| Paquetería externa | No se ha definido proveedor/API | No hay integración automática: guía/evidencia se registran por el operador. No presentar un simulador como servicio externo. |
| Responsive y accesibilidad completos | Navegador local, sesión y datos de prueba | 320, 390, 768, 1024 y 1440 px; teclado, foco de modales, tablas y acciones. |

El entorno de ejecución no permitió abrir el servidor MySQL en una revisión de autorización anterior. No se evitó esa restricción: la prueba SQL realizada fue inicialización offline, sin servidor escuchando. Las suites `test:integration` y `test:e2e` están preparadas, pero **no se presentan como aprobadas**.

## Ejecutar suites aisladas en Git Bash

Docker Desktop debe estar activo. Detén la tienda normal para liberar los puertos de servicios; QA usa una base y un volumen distintos, no la base comercial.

```bash
npm run configure:test
npm run qa:up
npm run db:migrate:test
npm run db:seed:test
npm run dev:services:test
```

En otra terminal, misma carpeta:

```bash
npm run test:integration
npm run test:e2e
```

Al terminar, `Ctrl+C` en la primera terminal y `npm run qa:down`. No ejecutar ambas suites simultáneamente. Las claves `local_contract_only` de `.env.test.example` son identificadores no válidos de un contrato: no crean pagos en Stripe. Las pruebas generan eventos firmados localmente y declaran esta diferencia. No sustituir las claves test por credenciales comerciales para estas suites.

## Evidencia visual

Se inspeccionó una copia temporal del HTML y los recursos exactos del build de producción. La cortina de nueve paneles completó su apertura y la franja roja siguió animada. Se conservaron el logotipo y las fotografías oficiales. A 320 px se detectó y corrigió la superposición del nombre de marca con los controles: se mantiene el logo y se oculta sólo el texto redundante. También se liberó el `clip-path` al terminar la entrada del encabezado; se confirmó que el menú móvil abre sin quedar recortado.

El navegador disponible no expone emulación de dispositivos ni cambio de viewport. Se usaron marcos del mismo origen de los cinco anchos solicitados. La barra vertical ocupa 15 px: las anchuras interiores medidas fueron 305, 375, 753, 1009 y 1425 px, respectivamente. En todos los casos `scrollWidth` coincidió con `clientWidth`, sin desbordamiento horizontal de la portada. Se inspeccionaron la composición en cada ancho y el bloque previo/pie en escritorio. Esto acredita esos estados de la portada; **no** certifica todos los dispositivos ni las pantallas privadas.

Esta copia visual no ejecuta el BFF ni los servicios: el catálogo mostró su estado de error real, sin productos de relleno. No permite validar compras, sesión o administración. La primera vista de desarrollo mostró un error de chunk en ese entorno de preview; el build de producción sí ejecutó las animaciones y el menú. La ejecución normal de desarrollo con los servicios activos debe confirmarse localmente; no se presenta el cambio de entorno como reparación demostrada de ese incidente.

Quedan por revisar con una sesión y datos persistidos: catálogo con existencias, detalle, carrito, checkout, historial, administración, modales, foco/teclado y estados de carga/error en cada ancho. No se incluyeron capturas con sesiones, compras o datos personales. El PDF visual de QA usa datos de prueba y no forma parte de la entrega como comprobante comercial.

Las salidas locales conservadas de Node, lint, tipos y build están en `docs/evidencias/`. Los resultados Python/C# provienen del avance anterior recuperado: no se fabrica una nueva salida de esas ejecuciones.

## Qué no significa «aprobado»

Compilar, responder `/live`, aceptar el DDL o aprobar dobles de red no demuestra una venta real. Las pruebas unitarias no sustituyen la conciliación Stripe, correo recibido, persistencia concurrente o demostración poliglota. La matriz usa «implementado» y señala explícitamente la prueba que falta; no declara 31/31 integraciones reales completadas.
