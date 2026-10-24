import Stripe from "stripe";

// Created on first use, not at import. `new Stripe()` throws without a key,
// and doing that at module load crashed the whole build when billing wasn't
// configured. Now the app runs without Stripe; only billing routes need it.
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export const BILLING_UNAVAILABLE = {
  error: "billing_unavailable",
  message: "Billing isn't set up on this deployment.",
} as const;
