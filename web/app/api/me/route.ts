import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/supabase";
import type { User } from "@/lib/types";

type MeRow = Pick<User, "plan" | "credits" | "rerolls_remaining" | "unlimited">;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let { data, error } = (await db
    .from("users")
    .select("plan, credits, rerolls_remaining, unlimited")
    .eq("id", user.id)
    .single()) as { data: MeRow | null; error: { code: string } | null };

  // First login: create the user row with the signup free-credits grant.
  // Kept explicit here (not just the DB column default) since "how many free
  // generations a new signup gets" is a product decision, not a schema detail.
  const SIGNUP_FREE_CREDITS = 3;

  if (error?.code === "PGRST116") {
    const insert = (await db
      .from("users")
      .insert({ id: user.id, email: user.email, credits: SIGNUP_FREE_CREDITS })
      .select("plan, credits, rerolls_remaining, unlimited")
      .single()) as { data: MeRow | null; error: { code: string } | null };
    data = insert.data;
    error = insert.error;
  }

  if (error || !data) {
    console.error("[/api/me] DB error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    userId: user.id,
    plan: data.plan,
    credits: data.credits,
    rerollsRemaining: data.rerolls_remaining,
    unlimited: data.unlimited,
  });
}
