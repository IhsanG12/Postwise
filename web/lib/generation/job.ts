import { type Db, db } from "@/lib/supabase";
import { generateImages, rerollSingleImage } from "./images";
import { generateVideo } from "./video";
import { saveCaptions } from "./captions";
import { saveSounds } from "./sounds";
import { planPost, BriefRejectedError } from "./plan";
import type { PlatformType, FormatType } from "@/lib/types";

// Prefix stored in jobs.error when the planner refuses a brief, so
// GET /api/generations/{jobId} can show the creator the reason.
export const BRIEF_REJECTED_PREFIX = "brief_rejected:";

export async function startGenerationJob(jobId: string): Promise<void> {
  try {
    const { data: job } = await db
      .from("jobs")
      .select("platform, format, with_face, selfie_upload_id, count, brief")
      .eq("id", jobId)
      .single() as {
        data: {
          platform: PlatformType;
          format: FormatType;
          with_face: boolean;
          selfie_upload_id: string | null;
          count: number;
          brief: string | null;
        } | null;
      };

    if (!job) throw new Error(`Job ${jobId} not found`);
    if (!job.brief) throw new Error(`Job ${jobId} has no brief`);

    // 1. Plan the whole post from the brief (one text-model call).
    const plan = await planPost({
      brief: job.brief,
      platform: job.platform,
      format: job.format,
      count: job.count,
      withFace: job.with_face,
    });
    // Saved so a reroll can redraw a slide from the same plan later.
    await db.from("jobs").update({ plan, progress: 0.05 }).eq("id", jobId);

    // 2. Make the images or the clip, then 3. store captions and sounds.
    if (job.format === "video") {
      await generateVideo(jobId, job.platform, plan, job.with_face, job.selfie_upload_id, db);
    } else {
      await generateImages(jobId, job.platform, plan, job.with_face, job.selfie_upload_id, db);
    }

    await Promise.all([
      saveCaptions(jobId, plan.captions, db),
      saveSounds(jobId, job.platform, plan.vibe, db),
    ]);

    await db.from("jobs").update({
      status: "complete",
      progress: 1,
      completed_at: new Date().toISOString(),
    }).eq("id", jobId);

  } catch (err) {
    const rejected = err instanceof BriefRejectedError;
    if (!rejected) console.error("[generation] Job failed", jobId, err);
    await db.from("jobs").update({
      status: "failed",
      error: rejected
        ? `${BRIEF_REJECTED_PREFIX} ${err.reason}`
        : err instanceof Error ? err.message : "generation_failed",
    }).eq("id", jobId);

    // The credit was charged up front in POST /api/generations before this
    // background job ran — a failed job produced nothing, so give it back.
    await refundCredit(jobId, db);
  }
}

async function refundCredit(jobId: string, db: Db): Promise<void> {
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

async function refundReroll(jobId: string, db: Db): Promise<void> {
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
