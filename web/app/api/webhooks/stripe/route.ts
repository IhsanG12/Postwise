import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Credits granted per plan on subscription start.
const PLAN_CREDITS: Record<string, number> = {
  creator: 50,
  pro:     0, // Pro users get unlimited = true instead of a credit count
};

// Checkout sessions started before the rename carry plan "larper" in their
// metadata; the database enum value is now "creator" (migration 005).
const LEGACY_PLAN_NAMES: Record<string, string> = { larper: "creator" };

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // Read raw body as Buffer — required for Stripe signature verification.
  // Using arrayBuffer avoids any string encoding issues in Next.js 16.
  const rawBody = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[webhook/stripe] Signature verification failed", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const rawPlan = session.metadata?.plan;
      const plan    = rawPlan ? LEGACY_PLAN_NAMES[rawPlan] ?? rawPlan : undefined;

      if (!userId || !plan || !(plan in PLAN_CREDITS)) {
        console.error("[webhook/stripe] Missing metadata on session", session.id);
        break;
      }

      const isPro = plan === "pro";
      const customerId = session.customer as string | null;

      await db.from("users").update({
        plan,
        credits:   isPro ? 0 : PLAN_CREDITS[plan],
        unlimited: isPro,
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      }).eq("id", userId);

      console.log(`[webhook/stripe] Upgraded user ${userId} to ${plan}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { error: downgradeError } = await db
        .from("users")
        .update({ plan: "free", credits: 0, unlimited: false })
        .eq("stripe_customer_id", customerId);

      if (downgradeError) {
        console.error(`[webhook/stripe] Failed to downgrade customer ${customerId}`, downgradeError);
        break;
      }

      console.log(`[webhook/stripe] Downgraded customer ${customerId} to free`);
      break;
    }

    default:
      // Ignore other event types.
      break;
  }

  return NextResponse.json({ received: true });
}
