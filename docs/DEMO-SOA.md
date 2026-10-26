# Demostración ante la profesora

Esta es una guía de ejecución, no un acta de pruebas aprobadas. Usar cuentas y datos de prueba identificados; guardar únicamente evidencias sin secretos. Preparar primero `.env`, migraciones, stock y los tres proveedores externos.

## 1. Mostrar independencia e interoperabilidad

Ejecuta `npm run dev` y `npm run diagnose`. Identifica los 13 puertos y tres lenguajes en `SERVICIOS.md`. Abre la red del navegador: el cliente sólo llama `/api`; sigue el ID de correlación en las terminales para observar BFF → pedidos C# → roles/auth Node → comercio Node. Reportes Node consulta alertas C#, que consulta inventario Node; proveedores y envíos son Flask, e historial FastAPI.

No usar un healthcheck como prueba de negocio: mostrar una solicitud, su respuesta y el cambio persistido en MySQL. No mostrar cookies, Authorization ni X-Service-Key en capturas.

## 2. Acceso y permisos

Registra CLIENTE con un correo propio, completa Turnstile y verifica el correo. Prueba contraseña incorrecta, token vencido, recuperación y cambio de contraseña. En otra sesión sin permisos, intenta una ruta administrativa: debe devolver 403. Cambia el rol de una cuenta de prueba desde ADMIN y comprueba la revocación. No modificar el rol del único administrador.

## 3. Aprovisionamiento

ADMIN/INVENTARIO: crea proveedor → registra compra de un producto → confirma → recibe. Verifica incremento de stock y bitácora. Intenta recibir dos veces: 409 y saldo sin cambios. Registra devolución parcial al proveedor; comprueba cantidades acumuladas y reporte de compras. Edita mínimos/máximos y consulta alertas C#; el mínimo es inclusivo (`actual <= mínimo`). Crea una oferta autorizada y comprueba el precio final del catálogo.

## 4. Compra y pago

CLIENTE: añade producto → cambia cantidades → registra domicilio → confirma carrito → Checkout test de Stripe. Revisa precios calculados en servidor, reserva, pedido/pago y estado final. Comprueba venta única, ticket único, PDF, correo aceptado y la compra en el historial FastAPI. Reenvía el mismo evento firmado y verifica que no duplica venta/stock/comprobante.

Repite en pruebas los casos: éxito, pendiente, rechazo, cancelación, webhook duplicado, varios clics, sincronización y retorno antes/después del webhook. Usar tarjetas test de Stripe y su panel/CLI; el JSON firmado local de los tests sólo es una prueba de contrato.

## 5. Preparación y entrega

VENTAS prepara el pedido pagado. LOGISTICA crea el paquete con medidas reales de prueba y guía, pasa a enviado/en tránsito, registra destinatario, fecha y URL de evidencia. Comprueba actualización persistida del historial. Registrar envasado del producto es otra operación; finalizarlo no incrementa el saldo.

## 6. Reseñas y posventa

Cliente comprador: crea, edita y elimina su reseña. Otro cliente no debe poder alterarla. Solicita garantía o devolución; ADMIN recorre sus estados. Recibir una devolución puede reintegrar unidades con autorización y motivo, una sola vez. Reembolsar debe mostrar el estado confirmado de Stripe; una aprobación comercial no equivale a reembolso completado.

## 7. Caída de una dependencia

Detén únicamente un proceso en un arranque separado; consulta la operación afectada. Debe mostrarse un error sin datos/éxito ficticios. Reinícialo y reintenta. En pagos, usa siempre la misma operación idempotente y consulta al proveedor antes de liberar inventario. La cola SMTP se mantiene si el correo falla.

## Evidencia mínima por escenario

Anota fecha, caso, rol, endpoint, estado HTTP, ID de correlación, entidad creada, saldo anterior/posterior y resultado esperado/observado. Usa folios de prueba; oculta datos personales. Conserva también fallos y pendientes. La prueba automatizada de estos contratos está en `tests/e2e/services.test.mjs`; requiere MySQL y todos los servicios activos.
