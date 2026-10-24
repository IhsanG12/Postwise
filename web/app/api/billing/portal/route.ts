import { NextRequest, NextResponse } from "next/server";
import { getStripe, BILLING_UNAVAILABLE } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(BILLING_UNAVAILABLE, { status: 503 });
  }

  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: userData, error: userError } = await db
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single() as { data: { stripe_customer_id: string | null } | null; error: unknown };

  if (userError || !userData) {
    console.error("[/api/billing/portal] Failed to fetch user", userError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!userData.stripe_customer_id) {
    return NextResponse.json(
      { error: "no_billing_account", message: "No billing account yet — subscribe to a plan first." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripe_customer_id,
    return_url: `${appUrl}/billing`,
  });

  return NextResponse.json({ portalUrl: session.url });
}
