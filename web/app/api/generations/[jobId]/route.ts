import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase, db } from "@/lib/supabase";
import { BRIEF_REJECTED_PREFIX } from "@/lib/generation/job";
import type { PostPlan } from "@/lib/generation/plan";
import type { Job, Asset, Caption, Sound } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  // Strip the "gen_" prefix to get the DB UUID.
  const jobUuid = jobId.startsWith("gen_") ? jobId.slice(4) : jobId;

  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, user_id, status, progress, platform, format, error, brief, plan")
    .eq("id", jobUuid)
    .single() as {
      data: (Pick<Job, "id" | "user_id" | "status" | "progress" | "platform" | "format" | "error"> & {
        brief: string | null;
        plan: PostPlan | null;
      }) | null;
      error: unknown;
    };

  if (jobError || !job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (job.status === "processing") {
    return NextResponse.json({ jobId, status: "processing", progress: job.progress });
  }

  if (job.status === "failed") {
    // The planner refused the brief: show its reason, and don't offer a
    // retry of the same brief (it would just be refused again).
    if (job.error?.startsWith(BRIEF_REJECTED_PREFIX)) {
      return NextResponse.json({
        jobId,
        status: "failed",
        error: "brief_rejected",
        message: job.error.slice(BRIEF_REJECTED_PREFIX.length).trim(),
        retryable: false,
        brief: job.brief,
      });
    }
    return NextResponse.json({ jobId, status: "failed", error: "generation_failed", retryable: true, brief: job.brief });
  }

  // Fetch assets, captions, and sounds in parallel.
  // Assets are ordered by scene_tag ("slide_01", "slide_02", …) = slide order.
  const [assetsRes, captionsRes, soundsRes] = (await Promise.all([
    db.from("assets").select("id, type, url, thumb_url, width, height, scene_tag, slide_text, rerollable").eq("job_id", jobUuid).order("scene_tag"),
    db.from("captions").select("id, text, tone").eq("job_id", jobUuid),
    db.from("sounds").select("id, title, meta, platform, open_url").eq("job_id", jobUuid),
  ])) as [
    { data: Asset[] | null; error: unknown },
    { data: Caption[] | null; error: unknown },
    { data: Sound[] | null; error: unknown },
  ];

  if (assetsRes.error || captionsRes.error || soundsRes.error) {
    console.error("[/api/generations/:jobId] Failed to fetch results", assetsRes.error, captionsRes.error, soundsRes.error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    jobId,
    status: "complete",
    platform: job.platform,
    format: job.format,
    post: {
      brief: job.brief,
      title: job.plan?.title ?? null,
      hashtags: job.plan?.hashtags ?? [],
    },
    assets: (assetsRes.data ?? []).map((a) => ({
      id: `ast_${a.id}`,
      type: a.type,
      url: a.url,
      thumbUrl: a.thumb_url,
      width: a.width,
      height: a.height,
      sceneTag: a.scene_tag,
      slideText: a.slide_text,
      rerollable: a.rerollable,
    })),
    captions: (captionsRes.data ?? []).map((c) => ({
      id: c.id,
      text: c.text,
      tone: c.tone,
    })),
    sounds: (soundsRes.data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      meta: s.meta,
      platform: s.platform,
      openUrl: s.open_url,
    })),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  const jobUuid = jobId.startsWith("gen_") ? jobId.slice(4) : jobId;

  const { data: job, error: jobError } = await db
    .from("jobs")
    .select("id, user_id")
    .eq("id", jobUuid)
    .single() as { data: { id: string; user_id: string } | null; error: unknown };

  if (jobError || !job || job.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Best-effort cleanup of the generated files so deleting history doesn't
  // leave orphaned objects in storage — a failure here shouldn't block the
  // actual delete, so it's logged rather than surfaced as an error.
  const { data: files, error: listError } = await supabase.storage
    .from("generations")
    .list(jobUuid);

  if (listError) {
    console.error("[/api/generations/:jobId DELETE] Failed to list storage objects", listError);
  } else if (files && files.length > 0) {
    const { error: removeError } = await supabase.storage
      .from("generations")
      .remove(files.map((f) => `${jobUuid}/${f.name}`));
    if (removeError) {
      console.error("[/api/generations/:jobId DELETE] Failed to remove storage objects", removeError);
    }
  }

  // Cascades to assets/captions/sounds via their job_id foreign keys.
  const { error: deleteError } = await db.from("jobs").delete().eq("id", jobUuid);

  if (deleteError) {
    console.error("[/api/generations/:jobId DELETE] Failed to delete job", deleteError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
