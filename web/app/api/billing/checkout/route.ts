import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Price IDs from your Stripe dashboard (Products → Prices).
// Add these to .env after creating the products in Stripe.
// STRIPE_PRICE_LARPER is the pre-rename name, still read so an existing
// deployment keeps working until its env is updated.
const PRICE_IDS: Record<string, string | undefined> = {
  creator: process.env.STRIPE_PRICE_CREATOR ?? process.env.STRIPE_PRICE_LARPER,
  pro:     process.env.STRIPE_PRICE_PRO,
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { plan } = body as Record<string, unknown>;
  if (plan !== "creator" && plan !== "pro") {
    return NextResponse.json({ error: "invalid_request", message: "plan must be 'creator' or 'pro'." }, { status: 400 });
  }

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json({ error: "server_error", message: "Price not configured for this plan." }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Reuse the existing Stripe customer if this user has one, so re-subscribing
  // (e.g. after a downgrade) doesn't create a duplicate customer in Stripe.
  const { data: userData } = await db
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single() as { data: { stripe_customer_id: string | null } | null };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(userData?.stripe_customer_id
      ? { customer: userData.stripe_customer_id }
      : { customer_email: user.email ?? undefined }),
    metadata: { userId: user.id, plan },
    success_url: `${appUrl}/pricing/success?plan=${plan}`,
    cancel_url:  `${appUrl}/pricing?checkout=cancelled`,
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
