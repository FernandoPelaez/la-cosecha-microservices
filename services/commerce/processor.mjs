import Stripe from "stripe";
import { ensure } from "../../packages/core/errors.mjs";

let instance;

export function processor() {
  ensure(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET,
    503,
    "El procesador de pagos todavía no está configurado",
  );

  instance ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 10000,
  });

  return instance;
}
