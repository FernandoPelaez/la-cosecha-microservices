import express from "express";
import { z } from "zod";
import { application, finish, ok } from "../../packages/core/http.mjs";
import { auth, internal, roles } from "../../packages/core/security.mjs";
import { id } from "../../packages/core/validation.mjs";
import { ensure } from "../../packages/core/errors.mjs";
import { getCart, setCartItem } from "./cart.mjs";
import { checkout, paymentMethods, paymentLink } from "./checkout.mjs";
import { processor } from "./processor.mjs";
import { settleSession } from "./payments.mjs";
import { addressRoutes } from "./addresses.mjs";
import { purchaseRoutes } from "./purchases.mjs";
import { receipt, receiptPDF, emailReceipt } from "./receipts.mjs";
import { cancelOrder } from "./cancellation.mjs";
import { administrationRoutes } from "./administration.mjs";
import { orderResult } from "./order-result.mjs";

const app = application("commerce");

app.post(
  "/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
  }),
  async (req, res) => {
    let event;

    try {
      event = processor().webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      ensure(false, 400, "Firma de pago inválida");
    }

    const supportedEvents = [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
    ];

    if (supportedEvents.includes(event.type)) {
      await settleSession(event.data.object, event.id, event.type);
    }

    ok(res, { received: true });
  },
);

app.use(
  internal,
  express.json({
    limit: "80kb",
  }),
);

app.get("/payment-methods", async (_req, res) => {
  ok(res, await paymentMethods());
});

app.use(auth);
app.use(
  [
    "/cart",
    "/addresses",
    "/checkout",
    "/retry-payment",
    "/cancel-order",
    "/order-result",
  ],
  roles("CLIENTE"),
);

app.get("/cart", async (req, res) => {
  ok(res, await getCart(req.user.clienteId));
});

app.put("/cart/:id", async (req, res) => {
  const productId = id.parse(req.params.id);
  const quantity = z.coerce
    .number()
    .int()
    .min(0)
    .max(10000)
    .parse(req.body.cantidad);

  const result = await setCartItem(req.user.clienteId, productId, quantity);

  ok(res, result);
});

app.post("/checkout", async (req, res) => {
  const data = z
    .object({
      id_direccion: id,
      id_tipo_pago: id,
      key: z.uuid(),
    })
    .parse(req.body);

  const result = await checkout(req.user, data);
  ok(res, result, 201);
});

app.post("/retry-payment/:id", async (req, res) => {
  const orderId = id.parse(req.params.id);
  const result = await paymentLink(req.user, orderId);
  ok(res, result);
});
app.post("/cancel-order/:id", async (req, res) =>
  ok(res, await cancelOrder(req.user, id.parse(req.params.id))),
);

app.get("/order-result/:id", async (req, res) => {
  const orderId = id.parse(req.params.id);
  ok(res, await orderResult(req.user, orderId));
});

addressRoutes(app);
purchaseRoutes(app);
administrationRoutes(app);

app.get("/receipts/:id", async (req, res) => {
  const receiptId = id.parse(req.params.id);
  const result = await receipt(req.user, receiptId);
  ok(res, result);
});

app.get("/receipts/:id/pdf", async (req, res) => {
  const receiptId = id.parse(req.params.id);
  const data = await receipt(req.user, receiptId);
  const pdf = await receiptPDF(data);
  res
    .set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${data.folio}.pdf"`,
    })
    .send(pdf);
});

app.post("/receipts/:id/email", async (req, res) => {
  const receiptId = id.parse(req.params.id);
  const result = await emailReceipt(req.user, receiptId);
  ok(res, result);
});

export default finish(app, 4003);
