import sharp from "sharp";
import type { GenerationConfig, Part } from "@google/generative-ai";
import { supabase, type Db } from "@/lib/supabase";
import { getDimensions, buildImagePrompt } from "./style";
import type { PostPlan, Slide } from "./plan";
import type { PlatformType } from "@/lib/types";

// TODO: swap PROVIDER back to "gemini" once Gemini billing is enabled.
const PROVIDER: "pollinations" | "gemini" = "pollinations";

// Pollinations 429s a full burst of 6 simultaneous requests from one client —
// cap how many run at once instead of firing them all together.
const IMAGE_CONCURRENCY = 2;

interface GeneratedAsset {
  id: string;
  sceneTag: string;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

interface Selfie {
  base64: string | null; // inline bytes, for the Gemini path
  mime: string;
  url: string | null;    // short-lived signed URL, for Pollinations' `image=` reference param
}

const NO_SELFIE: Selfie = { base64: null, mime: "image/jpeg", url: null };

// Selfies live in a private bucket and are deleted after use (CLAUDE.md
// safety rule #6), so each job signs a URL that expires in 5 minutes.
async function loadSelfie(selfieUploadId: string | null, db: Db): Promise<Selfie> {
  if (!selfieUploadId) return NO_SELFIE;
  const { data: row } = await db
    .from("uploads")
    .select("url")
    .eq("id", selfieUploadId)
    .single() as { data: { url: string } | null };
  if (!row) return NO_SELFIE;

  const selfie: Selfie = { ...NO_SELFIE };
  const { data: bytes } = await supabase.storage.from("selfies").download(row.url);
  if (bytes) {
    selfie.base64 = Buffer.from(await bytes.arrayBuffer()).toString("base64");
    selfie.mime = bytes.type || "image/jpeg";
  }
  const { data: signed } = await supabase.storage.from("selfies").createSignedUrl(row.url, 300);
  selfie.url = signed?.signedUrl ?? null;
  return selfie;
}

export async function generateImages(
  jobId: string,
  platform: PlatformType,
  plan: PostPlan,
  withFace: boolean,
  selfieUploadId: string | null,
  db: Db
): Promise<GeneratedAsset[]> {
  const { width, height } = getDimensions(platform);
  const selfie = withFace ? await loadSelfie(selfieUploadId, db) : NO_SELFIE;

  // Each slide is independent, so generate a couple at a time instead of one
  // after another (45–90s each). Full parallelism trips Pollinations' rate limit.
  let completed = 0;
  return mapWithConcurrency(plan.slides, IMAGE_CONCURRENCY, async (slide): Promise<GeneratedAsset> => {
    const { url, thumbUrl } = await generateAndUploadImage(jobId, plan, slide, width, height, withFace, selfie);

    const { data: asset, error } = await db
      .from("assets")
      .insert({
        job_id: jobId,
        type: "image",
        url,
        thumb_url: thumbUrl,
        width,
        height,
        scene_tag: slide.tag,
        slide_text: slide.text || null,
        rerollable: true,
      })
      .select("id")
      .single() as { data: { id: string } | null; error: unknown };
    if (error || !asset) throw new Error(`Failed to save asset: ${JSON.stringify(error)}`);

    completed += 1;
    await db.from("jobs").update({ progress: completed / plan.slides.length }).eq("id", jobId);
    return { id: asset.id, sceneTag: slide.tag };
  });
}

async function generateAndUploadImage(
  jobId: string,
  plan: PostPlan,
  slide: Slide,
  width: number,
  height: number,
  withFace: boolean,
  selfie: Selfie,
): Promise<{ url: string; thumbUrl: string }> {
  const fullPrompt = buildImagePrompt(plan, slide, withFace);

  let imageBuffer: Buffer;
  const mimeType = "image/jpeg";
  const ext = "jpg";

  if (PROVIDER === "pollinations") {
    // The legacy image.pollinations.ai/prompt/{prompt} host ignores the
    // `model` param entirely now (confirmed via its own /models endpoint,
    // which only lists a single fallback model) and ignores negative/nologo/
    // enhance too — none of those are documented on the current API.
    // gen.pollinations.ai/image/{prompt} is the maintained endpoint that
    // actually honors `model`, but requires a key even for free models.
    const encodedPrompt = encodeURIComponent(fullPrompt);
    // Seed must fit a 32-bit signed int (<=2147483647) — Date.now() is a
    // 13-digit ms timestamp, well over that, so wrap it into range.
    const seed = Date.now() % 2147483647;
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?width=${width}&height=${height}&model=klein&seed=${seed}`;
    // klein supports an `image` reference param for editing/identity anchoring —
    // pass the selfie so every shot uses the same uploaded face instead of a
    // new arbitrary person per scene.
    if (withFace && selfie.url) {
      url += `&image=${encodeURIComponent(selfie.url)}`;
    }

    // Retry on 429 — a transient throttle here shouldn't kill the whole job.
    const MAX_ATTEMPTS = 3;
    let res: Response | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}` },
      });
      if (res.ok || res.status !== 429 || attempt === MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
    if (!res!.ok) {
      const body = await res!.text().catch(() => "");
      throw new Error(`Pollinations request failed: ${res!.status} ${body}`);
    }
    imageBuffer = Buffer.from(await res!.arrayBuffer());
  } else {
    // Gemini path — requires billing to be enabled on the project.
    // Dynamic import — only runs when PROVIDER === "gemini".
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleGenerativeAI } = require("@google/generative-ai") as typeof import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-preview-image-generation" });
    const parts: Part[] = [{ text: fullPrompt }];
    if (withFace && selfie.base64) {
      parts.push({ inlineData: { mimeType: selfie.mime, data: selfie.base64 } });
    }
    // responseModalities is newer than this SDK version's GenerationConfig type.
    const generationConfig = { responseModalities: ["IMAGE"] } as GenerationConfig;
    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig,
    });
    const candidate = result.response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p) => p.inlineData);
    if (!imagePart?.inlineData?.data) throw new Error(`Gemini returned no image for ${slide.tag}`);
    imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  }

  // Resize to target dimensions.
  const resized = await sharp(imageBuffer).resize(width, height, { fit: "cover" }).toBuffer();

  // Create 400px-wide thumbnail.
  const thumb = await sharp(imageBuffer).resize(400).toBuffer();

  const basePath = `${jobId}/${slide.tag}_${Date.now()}`;
  const fullPath = `${basePath}.${ext}`;
  const thumbPath = `${basePath}_t.${ext}`;

  const [fullUpload, thumbUpload] = await Promise.all([
    supabase.storage.from("generations").upload(fullPath, resized, { contentType: mimeType }),
    supabase.storage.from("generations").upload(thumbPath, thumb, { contentType: mimeType }),
  ]);

  if (fullUpload.error || thumbUpload.error) {
    throw new Error(`Storage upload failed: ${JSON.stringify(fullUpload.error ?? thumbUpload.error)}`);
  }

  const { data: { publicUrl } } = supabase.storage.from("generations").getPublicUrl(fullPath);
  const { data: { publicUrl: thumbUrl } } = supabase.storage.from("generations").getPublicUrl(thumbPath);

  return { url: publicUrl, thumbUrl };
}

/**
 * Redraws one slide. It keeps the same scene and slide text from the job's
 * plan and only asks the model for a new image, so the post stays one post.
 */
export async function rerollSingleImage(jobId: string, assetId: string, db: Db): Promise<void> {
  const { data: existing } = await db
    .from("assets")
    .select("scene_tag, width, height")
    .eq("id", assetId)
    .single() as { data: { scene_tag: string; width: number; height: number } | null };
  if (!existing) throw new Error(`Asset ${assetId} not found`);

  const { data: job } = await db
    .from("jobs")
    .select("with_face, selfie_upload_id, plan")
    .eq("id", jobId)
    .single() as { data: { with_face: boolean; selfie_upload_id: string | null; plan: PostPlan | null } | null };
  if (!job) throw new Error(`Job ${jobId} not found`);

  // Jobs made before the Postwise pivot have no plan to redraw from.
  const slide = job.plan?.slides.find((s) => s.tag === existing.scene_tag);
  if (!job.plan || !slide) throw new Error(`No plan slide ${existing.scene_tag} for job ${jobId}`);

  const selfie = job.with_face ? await loadSelfie(job.selfie_upload_id, db) : NO_SELFIE;
  const { url, thumbUrl } = await generateAndUploadImage(
    jobId, job.plan, slide, existing.width, existing.height, job.with_face, selfie
  );

  // Update the row in place so the same asset id now points at the new image
  // (ResultsGrid polls by id to see the change).
  const { error } = await db.from("assets").update({ url, thumb_url: thumbUrl }).eq("id", assetId);
  if (error) throw new Error(`Failed to update rerolled asset: ${JSON.stringify(error)}`);
}
