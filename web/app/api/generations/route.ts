import { NextRequest, NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { startGenerationJob } from "@/lib/generation/job";
import { validateBrief, cleanBrief } from "@/lib/brief";
import type { PlatformType, FormatType } from "@/lib/types";

// The job keeps running after the 202 goes out (see `after` below), so the
// function needs room for a full slideshow: ~50s per image, two at a time.
export const maxDuration = 300;

const PLATFORMS: PlatformType[] = ["instagram", "tiktok"];
const FORMATS: FormatType[] = ["slideshow", "video"];
// ~50s/image observed against the current image provider (lib/generation/images.ts).
// Estimate scales with count so it stays honest as the default slideshow size changes.
const SECONDS_PER_IMAGE = 50;
// Placeholder until real Replicate video-generation timings are observed —
// this needs the same "watch real behavior, then correct" pass the slideshow
// estimate already got (it started as a flat, wildly-optimistic 20s too).
const VIDEO_ESTIMATE_SECONDS = 90;
function estimateSeconds(format: FormatType, count: number): number {
  return format === "video" ? VIDEO_ESTIMATE_SECONDS : count * SECONDS_PER_IMAGE;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  // Fetch one extra row past `limit` to know whether there's another page.
  const { data: jobs, error: jobsError } = await db
    .from("jobs")
    .select("id, status, platform, format, count, with_face, brief, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit) as {
      data: {
        id: string;
        status: "processing" | "complete" | "failed";
        platform: PlatformType;
        format: FormatType;
        count: number;
        with_face: boolean;
        brief: string | null;
        created_at: string;
      }[] | null;
      error: unknown;
    };

  if (jobsError) {
    console.error("[/api/generations GET] Failed to fetch jobs", jobsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const page = (jobs ?? []).slice(0, limit);
  const hasMore = (jobs ?? []).length > limit;

  // One query for every asset across this page's jobs, then keep the earliest
  // per job as its thumbnail — avoids an N+1 query per row.
  const jobIds = page.map((j) => j.id);
  const thumbByJob = new Map<string, string>();
  if (jobIds.length > 0) {
    const { data: assets } = await db
      .from("assets")
      .select("job_id, thumb_url, created_at")
      .in("job_id", jobIds)
      .order("created_at", { ascending: true }) as {
        data: { job_id: string; thumb_url: string; created_at: string }[] | null;
      };

    for (const a of assets ?? []) {
      if (!thumbByJob.has(a.job_id)) thumbByJob.set(a.job_id, a.thumb_url);
    }
  }

  return NextResponse.json({
    jobs: page.map((j) => ({
      jobId: `gen_${j.id}`,
      status: j.status,
      platform: j.platform,
      format: j.format,
      count: j.count,
      withFace: j.with_face,
      brief: j.brief,
      createdAt: j.created_at,
      thumbUrl: thumbByJob.get(j.id) ?? null,
    })),
    hasMore,
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_request", message: "Expected JSON body." }, { status: 400 });
  }

  const { platform, format, withFace, selfieUploadId, count, brief } = body as Record<string, unknown>;

  const briefError = validateBrief(brief);
  if (briefError) {
    return NextResponse.json({ error: "invalid_request", message: briefError }, { status: 400 });
  }

  if (!PLATFORMS.includes(platform as PlatformType)) {
    return NextResponse.json({ error: "invalid_request", message: "platform must be 'instagram' or 'tiktok'." }, { status: 400 });
  }
  if (!FORMATS.includes(format as FormatType)) {
    return NextResponse.json({ error: "invalid_request", message: "format must be 'slideshow' or 'video'." }, { status: 400 });
  }
  if (typeof withFace !== "boolean") {
    return NextResponse.json({ error: "invalid_request", message: "withFace must be a boolean." }, { status: 400 });
  }
  if (withFace && (typeof selfieUploadId !== "string" || !selfieUploadId.startsWith("upl_"))) {
    return NextResponse.json({ error: "invalid_request", message: "selfieUploadId is required when withFace is true." }, { status: 400 });
  }
  if (format === "slideshow" && (typeof count !== "number" || count < 1 || count > 10)) {
    return NextResponse.json({ error: "invalid_request", message: "count must be a number between 1 and 10." }, { status: 400 });
  }

  // Read current credits.
  const { data: userData, error: userError } = await db
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single() as { data: { credits: number } | null; error: unknown };

  if (userError || !userData) {
    console.error("[/api/generations] Failed to fetch user", userError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (userData.credits <= 0) {
    return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
  }

  // Deduct 1 credit.
  const { error: deductError } = await db
    .from("users")
    .update({ credits: userData.credits - 1 })
    .eq("id", user.id);

  if (deductError) {
    console.error("[/api/generations] Failed to deduct credit", deductError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Strip the "upl_" prefix to get the upload UUID for the DB foreign key.
  const uploadUuid = withFace ? (selfieUploadId as string).replace("upl_", "") : null;

  const { data: job, error: jobError } = await db
    .from("jobs")
    .insert({
      user_id: user.id,
      platform,
      format,
      with_face: withFace,
      selfie_upload_id: uploadUuid,
      count: format === "slideshow" ? count : 1,
      brief: cleanBrief(brief as string),
    })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (jobError || !job) {
    console.error("[/api/generations] Failed to create job", jobError);
    // Refund the credit since the job wasn't created.
    await db.from("users").update({ credits: userData.credits }).eq("id", user.id);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Respond right away and run the job after the response. A bare un-awaited
  // promise can be frozen mid-job on serverless hosts once the response is
  // sent; `after` keeps the function alive until the job settles.
  // startGenerationJob catches its own errors and refunds the credit.
  after(() => startGenerationJob(job.id));

  return NextResponse.json(
    {
      jobId: `gen_${job.id}`,
      status: "processing",
      estimatedSeconds: estimateSeconds(format as FormatType, count as number),
      creditsCharged: 1,
    },
    { status: 202 }
  );
}
