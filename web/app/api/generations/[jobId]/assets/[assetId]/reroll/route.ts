import { NextRequest, NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { rerollAsset } from "@/lib/generation/job";

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; assetId: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { jobId, assetId } = await params;
  const jobUuid = jobId.startsWith("gen_") ? jobId.slice(4) : jobId;
  const assetUuid = assetId.startsWith("ast_") ? assetId.slice(4) : assetId;

  // Verify the job exists and belongs to this user.
  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, user_id")
    .eq("id", jobUuid)
    .single() as { data: { id: string; user_id: string } | null; error: unknown };

  if (jobError || !job || job.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Verify the asset belongs to this job.
  const { data: asset, error: assetError } = await db
    .from("assets")
    .select("id")
    .eq("id", assetUuid)
    .eq("job_id", jobUuid)
    .single() as { data: { id: string } | null; error: unknown };

  if (assetError || !asset) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Check rerolls remaining.
  const { data: userData, error: userError } = await db
    .from("users")
    .select("rerolls_remaining")
    .eq("id", user.id)
    .single() as { data: { rerolls_remaining: number } | null; error: unknown };

  if (userError || !userData) {
    console.error("[/api/.../reroll] Failed to fetch user", userError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (userData.rerolls_remaining <= 0) {
    return NextResponse.json({ error: "no_rerolls_remaining" }, { status: 402 });
  }

  const newRerolls = userData.rerolls_remaining - 1;

  const { error: deductError } = await db
    .from("users")
    .update({ rerolls_remaining: newRerolls })
    .eq("id", user.id);

  if (deductError) {
    console.error("[/api/.../reroll] Failed to deduct reroll", deductError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Same as job creation: run after the response, but keep the function alive.
  after(() => rerollAsset(jobUuid, assetUuid));

  return NextResponse.json(
    {
      assetId,
      status: "processing",
      creditsCharged: 1,
      rerollsRemaining: newRerolls,
    },
    { status: 202 }
  );
}
