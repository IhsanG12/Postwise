import Replicate from "replicate";
import { supabase } from "@/lib/supabase";
import { pickScenes, getDimensions } from "./scenes";
import type { PlatformType } from "@/lib/types";

// Replicate gives us multiple video models under one API key, so swapping
// providers is a one-line change instead of a rewrite. Start on the cheap
// model for testing, move to Kling once real output quality/cost is validated.
const MODEL_CONFIG = {
  testing: "wavespeedai/wan-2.1-t2v-480p",
  launch: "kwaivgi/kling-v1-5-pro",
};
const MODEL: string = MODEL_CONFIG.testing; // change to MODEL_CONFIG.launch when ready

const POLL_INTERVAL_MS = 3000;
// ~5 minutes ceiling — video generation is slow but shouldn't run forever.
const MAX_POLL_ATTEMPTS = 100;

interface GeneratedAsset {
  id: string;
  sceneTag: string;
}

export async function generateVideo(
  jobId: string,
  platform: PlatformType,
  withFace: boolean,
  selfieUploadId: string | null,
  db: any
): Promise<GeneratedAsset[]> {
  // No style/theme system anymore — draw the setting from the same unified
  // scene pool images use, same as pickScenes() elsewhere in lib/generation.
  const [scene] = pickScenes(1, withFace, []);
  const { width, height } = getDimensions(platform);

  let selfieUrl: string | null = null;
  if (withFace && selfieUploadId) {
    const { data: selfieRow } = await db
      .from("uploads")
      .select("url")
      .eq("id", selfieUploadId)
      .single() as { data: { url: string } | null };

    if (selfieRow) {
      const { data: signed } = await supabase.storage
        .from("selfies")
        .createSignedUrl(selfieRow.url, 600);
      selfieUrl = signed?.signedUrl ?? null;
    }
  }

  const peopleDirective = withFace
    ? "The same person shown in the reference image appears in the clip, naturally moving through the scene " +
      "(walking into frame, sitting down, turning toward camera) — keep their face, identity, and features " +
      "consistent with the reference. Natural, anatomically correct motion, no distorted limbs, no CGI/render look."
    : "No people, faceless luxury scene, camera gliding smoothly through the environment.";

  const prompt =
    `Cinematic luxury lifestyle video clip, 5-8 seconds, smooth natural camera motion, shot on a real camera. ` +
    `${scene.prompt} ${peopleDirective}`;

  const aspectRatio = height > width ? "9:16" : "16:9";

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY });

  const input: Record<string, unknown> = { prompt, aspect_ratio: aspectRatio };
  if (selfieUrl) input.image = selfieUrl;

  let prediction = await replicate.predictions.create({ model: MODEL, input });
  await db.from("jobs").update({ progress: 0.1 }).eq("id", jobId);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled") {
      break;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    prediction = await replicate.predictions.get(prediction.id);
    // Creep progress toward 0.9 while polling; the last stretch is the download/upload below.
    const pct = Math.min(0.1 + (attempt / MAX_POLL_ATTEMPTS) * 0.8, 0.9);
    await db.from("jobs").update({ progress: pct }).eq("id", jobId);
  }

  if (prediction.status !== "succeeded") {
    throw new Error(`Replicate video generation ${prediction.status}: ${JSON.stringify(prediction.error ?? "unknown error")}`);
  }

  const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!videoUrl || typeof videoUrl !== "string") {
    throw new Error("Replicate returned no video output");
  }

  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Failed to download video from Replicate: ${res.status}`);
  const videoBuffer = Buffer.from(await res.arrayBuffer());

  const basePath = `${jobId}/${scene.tag}_${Date.now()}`;
  const fullPath = `${basePath}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("generations")
    .upload(fullPath, videoBuffer, { contentType: "video/mp4" });
  if (uploadError) throw new Error(`Storage upload failed: ${JSON.stringify(uploadError)}`);

  const { data: { publicUrl } } = supabase.storage.from("generations").getPublicUrl(fullPath);

  const { data: asset, error: assetError } = await db
    .from("assets")
    .insert({
      job_id: jobId,
      type: "video",
      url: publicUrl,
      // No frame-extraction step yet (would need ffmpeg, not currently a
      // dependency) — frontend falls back to a native <video> element with
      // its own poster frame instead of relying on a separate thumbUrl.
      thumb_url: null,
      width,
      height,
      scene_tag: scene.tag,
      // rerollSingleImage (the only reroll path wired up in job.ts) calls
      // Replicate's image logic, not this file — rerolling a video asset
      // today would silently generate a JPG into a row still typed "video".
      // Keep this false until a dedicated video reroll path exists.
      rerollable: false,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (assetError || !asset) {
    throw new Error(`Failed to save asset: ${JSON.stringify(assetError)}`);
  }

  await db.from("jobs").update({ progress: 1 }).eq("id", jobId);

  return [{ id: asset.id, sceneTag: scene.tag }];
}
