import type { PlatformType } from "@/lib/types";

const PROVIDER: "hardcoded" | "gemini" = "gemini";

interface Caption {
  text: string;
  tone: string;
}

const FALLBACK_CAPTIONS: Caption[] = [
  { text: "Just another Tuesday 🤍", tone: "understated" },
  { text: "POV: the grind paid off", tone: "aspirational" },
  { text: "larp unlocked 🔓", tone: "humorous" },
  { text: "some doors you don't knock on. you just walk in.", tone: "mysterious" },
];

export async function generateCaptions(
  jobId: string,
  platform: PlatformType,
  sceneTags: string[],
  db: any
): Promise<void> {
  let captions: Caption[] = FALLBACK_CAPTIONS;

  if (PROVIDER === "gemini") {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      // "gemini-1.5-flash" was fully retired (confirmed via ListModels — it's
      // not in the current catalog at all). Using the "-latest" alias instead
      // of a pinned version this time, so Google's model rotation doesn't
      // silently break this again the way it did here.
      const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

      const sceneList = sceneTags.join(", ");
      const platformNote = platform === "instagram"
        ? "Instagram (polish, aesthetics, aspirational)"
        : "TikTok (punchy, trend-aware, Gen Z tone)";

      const prompt = `You are a social media copywriter for a luxury lifestyle brand.
Generate exactly 4 short captions for a ${platformNote} post featuring: ${sceneList}.
Rules: no earnings claims, no brand names, fun and self-aware.
Return ONLY a JSON array:
[{"text":"...","tone":"understated"},{"text":"...","tone":"aspirational"},{"text":"...","tone":"humorous"},{"text":"...","tone":"mysterious"}]`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
      captions = JSON.parse(raw);
    } catch (err) {
      console.error("[captions] Gemini generation failed, falling back to hardcoded captions", err);
      captions = FALLBACK_CAPTIONS;
    }
  }

  const rows = captions.slice(0, 4).map((c) => ({
    job_id: jobId,
    text: c.text,
    tone: c.tone,
  }));

  const { error } = await db.from("captions").insert(rows);
  if (error) throw new Error(`Failed to save captions: ${JSON.stringify(error)}`);
}
