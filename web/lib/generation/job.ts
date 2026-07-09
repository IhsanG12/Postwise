import { supabase } from "@/lib/supabase";
import { generateImages, rerollSingleImage } from "./images";
import { generateVideo } from "./video";
import { generateCaptions } from "./captions";
import { saveSounds } from "./sounds";
import type { PlatformType, FormatType } from "@/lib/types";

const db = supabase as any;

export async function startGenerationJob(jobId: string): Promise<void> {
  try {
    const { data: job } = await db
      .from("jobs")
      .select("platform, format, with_face, selfie_upload_id, count")
      .eq("id", jobId)
      .single() as {
        data: {
          platform: PlatformType;
          format: FormatType;
          with_face: boolean;
          selfie_upload_id: string | null;
          count: number;
        } | null;
      };

    if (!job) throw new Error(`Job ${jobId} not found`);

    // Generate assets (video: one Replicate clip; slideshow: N images) and
    // collect scene tags — same shape either way so captions/sounds below
    // don't need to know which path ran.
    const assets = job.format === "video"
      ? await generateVideo(jobId, job.platform, job.with_face, job.selfie_upload_id, db)
      : await generateImages(
          jobId,
          job.platform,
          job.format,
          job.with_face,
          job.selfie_upload_id,
          job.count,
          db
        );

    const sceneTags = assets.map((a) => a.sceneTag);

    // Generate captions and sounds in parallel.
    await Promise.all([
      generateCaptions(jobId, job.platform, sceneTags, db),
      saveSounds(jobId, job.platform, sceneTags, db),
    ]);

    // Mark job complete.
    await db.from("jobs").update({
      status: "complete",
      progress: 1,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

  } catch (err) {
    console.error("[generation] Job failed", jobId, err);
    await db.from("jobs").update({
      status: "failed",
      error: err instanceof Error ? err.message : "generation_failed",
    }).eq("id", jobId);

    // The credit was charged up front in POST /api/generations before this
    // background job ran — a failed job produced nothing, so give it back.
    await refundCredit(jobId, db);
  }
}

async function refundCredit(jobId: string, db: any): Promise<void> {
  const { data: job } = await db
    .from("jobs")
    .select("user_id")
    .eq("id", jobId)
    .single() as { data: { user_id: string } | null };
  if (!job) return;

  const { data: userData } = await db
    .from("users")
    .select("credits")
    .eq("id", job.user_id)
    .single() as { data: { credits: number } | null };
  if (!userData) return;

  await db.from("users").update({ credits: userData.credits + 1 }).eq("id", job.user_id);
}

export async function rerollAsset(jobId: string, assetId: string): Promise<void> {
  try {
    await rerollSingleImage(jobId, assetId, db);
  } catch (err) {
    console.error("[generation] Reroll failed", assetId, err);

    // The reroll was charged up front in the reroll endpoint — a failed
    // reroll produced nothing, so give it back.
    await refundReroll(jobId, db);
  }
}

async function refundReroll(jobId: string, db: any): Promise<void> {
  const { data: job } = await db
    .from("jobs")
    .select("user_id")
    .eq("id", jobId)
    .single() as { data: { user_id: string } | null };
  if (!job) return;

  const { data: userData } = await db
    .from("users")
    .select("rerolls_remaining")
    .eq("id", job.user_id)
    .single() as { data: { rerolls_remaining: number } | null };
  if (!userData) return;

  await db.from("users").update({ rerolls_remaining: userData.rerolls_remaining + 1 }).eq("id", job.user_id);
}
