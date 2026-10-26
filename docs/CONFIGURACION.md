# Proveedores externos y secretos

Completa `.env` localmente y reinicia los procesos. No modificar `.env.example` con claves reales ni incluir `.env` en el ZIP. `configure` crea `JWT_SECRET` y `SERVICE_KEY` aleatorias; todos los servicios de una instalación deben compartirlas. Las URLs internas nunca se publican como variables `NEXT_PUBLIC_*`.

## Turnstile

Registra un widget para el hostname usado al abrir la tienda. Define `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` y `TURNSTILE_HOSTNAME=localhost` para desarrollo local. Usa una pareja de claves del mismo widget. Las claves de prueba oficiales sólo sirven para probar la integración del entorno test y no acreditan resistencia real a bots.

El navegador solicita el token para cada acción; `services/auth/bot.mjs` valida en Cloudflare éxito, hostname y acción. Login, registro y recuperación quedan protegidos. Un token ausente, vencido o con acción distinta falla; no hay botón de «omitir». Si cambias la clave pública, reinicia Next y recompila al usar producción.

## SMTP

Define `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` y **`MAIL_FROM`**. Usa un remitente autorizado por tu proveedor. Puerto 465 suele requerir `SMTP_SECURE=true`; para 587 se configura `false` y el transporte negocia STARTTLS cuando corresponde. No deshabilitar la validación TLS.

Registro y recuperación envían enlaces a `APP_URL`. Los tokens se almacenan como hash, tienen vencimiento y se consumen una sola vez. Verifica un correo de tu propiedad en la instalación local. La cola de comprobantes se procesa automáticamente junto a `dev`/`start`, y manualmente con `npm run receipts:deliver`.

`comprobantes.enviado_correo` y `cola_comprobantes.estado='enviado'` significan aceptación por SMTP, **no** lectura ni entrega comprobada al buzón. Los errores mantienen la cola pendiente con reintentos. No se incluyó telemetría de entrega del proveedor.

## Stripe Checkout en modo de pruebas

1. Utiliza una cuenta Stripe en modo test. Define `STRIPE_SECRET_KEY` con su clave test.
2. Con Stripe CLI autenticada localmente, escucha los eventos y reenvía al BFF:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

3. Copia la clave de firma que muestre esa sesión de CLI en `STRIPE_WEBHOOK_SECRET`; no es la clave API. Reinicia los servicios.
4. Define `PAYMENTS_ENABLED=true`. `APP_URL=http://localhost:3000` debe coincidir con el navegador; no alternes localhost y 127.0.0.1 durante el mismo flujo.
5. Registra una cuenta CLIENTE, verifica correo, configura stock real de prueba, domicilio y compra. Introduce únicamente tarjetas de prueba publicadas por Stripe en su Checkout. No usar tarjetas reales para esta demostración.

El webhook admite `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` y `checkout.session.expired`. Se conserva el cuerpo original para verificar firma, importe, moneda y referencia. No hay transferencia/SPEI. El formulario de tarjeta pertenece a Stripe; PAN/CVV no entran en nuestros endpoints.

### Interrupciones y conciliación

- Si el webhook tarda, `/order-result/:id` consulta el proveedor y usa la misma transacción de confirmación.
- `npm run payments:reconcile` revisa pedidos pendientes con referencia Stripe. Repetirlo es seguro respecto a la creación de ventas/comprobantes.
- Un pedido pendiente permite volver al Checkout abierto o cancelar tras expirar la sesión en Stripe. La navegación de regreso no cancela por sí sola.
- Un reembolso se solicita desde posventa después de recibir la devolución. Se consulta su estado antes de afirmar que terminó. Repetir la acción recupera la misma referencia/metadata.
- **Caso que requiere revisión operativa:** corte entre crear la sesión Stripe y persistir su referencia. Un reintento inmediato con la misma clave puede recuperar la sesión; si expiró su ventana, revisar Stripe usando `client_reference_id`/metadata antes de asociar la referencia mediante una intervención controlada. No liberar stock ni crear otra sesión a ciegas. No se entrega un botón que marque un pago como pagado manualmente.

No se han ejecutado cobros test externos ni correos reales desde este entorno: faltan las credenciales de la instalación. Los contratos automatizados con claves `local_contract_only` no salen a Stripe y no deben confundirse con estas pruebas.
