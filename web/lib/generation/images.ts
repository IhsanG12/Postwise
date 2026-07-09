import sharp from "sharp";
import { supabase } from "@/lib/supabase";
import { pickScenes, getDimensions, sceneGroup, type Scene } from "./scenes";
import type { PlatformType, FormatType } from "@/lib/types";

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

export async function generateImages(
  jobId: string,
  platform: PlatformType,
  format: FormatType,
  withFace: boolean,
  selfieUploadId: string | null,
  count: number,
  db: any
): Promise<GeneratedAsset[]> {
  const scenes = pickScenes(count, withFace, []);
  const { width, height } = getDimensions(platform);
  const assets: GeneratedAsset[] = [];

  // Download selfie once if needed (used by the Gemini path's inline image data).
  let selfieBase64: string | null = null;
  let selfieMime = "image/jpeg";
  // Pollinations' `image=` reference param needs a fetchable URL, not inline
  // bytes — sign one short-lived so klein actually uses the uploaded face
  // instead of hallucinating an arbitrary person for every scene.
  let selfieUrl: string | null = null;
  if (withFace && selfieUploadId) {
    const { data: selfieRow } = await db
      .from("uploads")
      .select("url")
      .eq("id", selfieUploadId)
      .single() as { data: { url: string } | null };

    if (selfieRow) {
      const { data: selfieBytes } = await supabase.storage
        .from("selfies")
        .download(selfieRow.url);
      if (selfieBytes) {
        const buf = Buffer.from(await selfieBytes.arrayBuffer());
        selfieBase64 = buf.toString("base64");
        selfieMime = selfieBytes.type || "image/jpeg";
      }

      const { data: signed } = await supabase.storage
        .from("selfies")
        .createSignedUrl(selfieRow.url, 300);
      selfieUrl = signed?.signedUrl ?? null;
    }
  }

  // Generate images with limited concurrency instead of one at a time — each
  // scene is independent, so there's no reason to serialize on the provider's
  // per-request latency (45-90s each; 6 in sequence was taking 5-6 minutes).
  // Full parallelism (6 at once) trips Pollinations' rate limit, so cap it.
  let completed = 0;
  const results = await mapWithConcurrency(scenes, IMAGE_CONCURRENCY, async (scene): Promise<GeneratedAsset> => {
    const assetId = await generateSingleImage(
      jobId, scene, width, height, withFace, selfieBase64, selfieMime, selfieUrl, db
    );
    completed += 1;
    await db.from("jobs").update({ progress: completed / scenes.length }).eq("id", jobId);
    return { id: assetId, sceneTag: scene.tag };
  });
  assets.push(...results);

  return assets;
}

async function generateAndUploadImage(
  jobId: string,
  scene: Scene,
  width: number,
  height: number,
  withFace: boolean,
  selfieBase64: string | null,
  selfieMime: string,
  selfieUrl: string | null,
): Promise<{ url: string; thumbUrl: string }> {
  // This used to unconditionally say "No people, faceless" regardless of
  // withFace — directly contradicting the FACE_SCENES prompts that describe
  // a person, which is part of why face-mode shots were coming back empty.
  const peopleDirective = withFace
    ? "Photorealistic portrait of the same person shown in the reference image — keep their face, identity, and features consistent with the reference. " +
      "Change their outfit to match the scene described above — do not copy the clothing from the reference photo verbatim; every scene is a different day/occasion with its own appropriate attire. " +
      "Natural, anatomically correct body proportions and posture — no distorted limbs, no warped hands, no CGI/render look."
    : "No people, faceless luxury scene.";
  const fullPrompt = `${scene.prompt}. High quality, photorealistic, luxury lifestyle photography, shot on a real camera. ${peopleDirective} Natural skin texture and lighting, not 3D-rendered, not an AI-illustration look. No brand logos, no trademarks, no real currency.`;

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
    if (withFace && selfieUrl) {
      url += `&image=${encodeURIComponent(selfieUrl)}`;
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
    const parts: any[] = [{ text: fullPrompt }];
    if (withFace && selfieBase64) {
      parts.push({ inlineData: { mimeType: selfieMime, data: selfieBase64 } });
    }
    const result = await (model as any).generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    });
    const candidate = result.response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
    if (!imagePart?.inlineData?.data) throw new Error(`Gemini returned no image for scene ${scene.tag}`);
    imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  }

  // Resize to target dimensions.
  const resized = await sharp(imageBuffer).resize(width, height, { fit: "cover" }).toBuffer();

  // Create 400px-wide thumbnail.
  const thumb = await sharp(imageBuffer).resize(400).toBuffer();

  const basePath = `${jobId}/${scene.tag}_${Date.now()}`;
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

async function generateSingleImage(
  jobId: string,
  scene: Scene,
  width: number,
  height: number,
  withFace: boolean,
  selfieBase64: string | null,
  selfieMime: string,
  selfieUrl: string | null,
  db: any
): Promise<string> {
  const { url, thumbUrl } = await generateAndUploadImage(
    jobId, scene, width, height, withFace, selfieBase64, selfieMime, selfieUrl
  );

  const { data: asset, error: assetError } = await db
    .from("assets")
    .insert({
      job_id: jobId,
      type: "image",
      url,
      thumb_url: thumbUrl,
      width,
      height,
      scene_tag: scene.tag,
      rerollable: true,
    })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (assetError || !asset) {
    throw new Error(`Failed to save asset: ${JSON.stringify(assetError)}`);
  }

  return asset.id;
}

export async function rerollSingleImage(
  jobId: string,
  assetId: string,
  db: any
): Promise<void> {
  // Fetch the existing asset to get scene tag and dimensions.
  const { data: existing } = await db
    .from("assets")
    .select("scene_tag, width, height, job_id")
    .eq("id", assetId)
    .single() as { data: { scene_tag: string; width: number; height: number; job_id: string } | null };

  if (!existing) throw new Error(`Asset ${assetId} not found`);

  const { data: job } = await db
    .from("jobs")
    .select("platform, format, with_face, selfie_upload_id")
    .eq("id", jobId)
    .single() as { data: { platform: PlatformType; format: FormatType; with_face: boolean; selfie_upload_id: string | null } | null };

  if (!job) throw new Error(`Job ${jobId} not found`);

  // Exclude scenes already present in this job so a reroll doesn't just
  // duplicate a tile that's already in the set.
  const { data: siblingAssets } = await db
    .from("assets")
    .select("scene_tag")
    .eq("job_id", jobId) as { data: { scene_tag: string }[] | null };

  const usedTags = (siblingAssets ?? []).map((a) => a.scene_tag);
  // Stay within the same story group as the rest of the job's assets — a
  // reroll shouldn't jump the whole set from, say, a yacht trip to a ski
  // chalet just because that one tile got redrawn.
  const existingGroup = usedTags.map(sceneGroup).find((g) => g !== null) ?? undefined;
  const [newScene] = pickScenes(1, job.with_face, usedTags, existingGroup);

  let selfieBase64: string | null = null;
  let selfieMime = "image/jpeg";
  let selfieUrl: string | null = null;
  if (job.with_face && job.selfie_upload_id) {
    const { data: selfieRow } = await db
      .from("uploads")
      .select("url")
      .eq("id", job.selfie_upload_id)
      .single() as { data: { url: string } | null };
    if (selfieRow) {
      const { data: bytes } = await supabase.storage.from("selfies").download(selfieRow.url);
      if (bytes) {
        selfieBase64 = Buffer.from(await bytes.arrayBuffer()).toString("base64");
        selfieMime = bytes.type || "image/jpeg";
      }

      const { data: signed } = await supabase.storage
        .from("selfies")
        .createSignedUrl(selfieRow.url, 300);
      selfieUrl = signed?.signedUrl ?? null;
    }
  }

  const { url, thumbUrl } = await generateAndUploadImage(
    jobId, newScene, existing.width, existing.height, job.with_face, selfieBase64, selfieMime, selfieUrl
  );

  // Update the existing row in place — keeps the same asset id so
  // ResultsGrid's reroll polling (which looks up assets by id) finds the change.
  const { error: updateError } = await db
    .from("assets")
    .update({ url, thumb_url: thumbUrl, scene_tag: newScene.tag })
    .eq("id", assetId);

  if (updateError) {
    throw new Error(`Failed to update rerolled asset: ${JSON.stringify(updateError)}`);
  }
}
