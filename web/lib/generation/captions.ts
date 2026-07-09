import type { PlatformType } from "@/lib/types";
import { callGeminiJSON } from "./gemini";

const PROVIDER: "hardcoded" | "gemini" = "gemini";

interface Caption {
  text: string;
  tone: string;
}

const FALLBACK_CAPTIONS: Caption[] = [
  { text: "just a tuesday #larp 🤍", tone: "understated" },
  { text: "grind arc, unlocked #mainCharacterEnergy", tone: "aspirational" },
  { text: "larp unlocked 🔓 #delulu", tone: "humorous" },
  { text: "some doors you don't knock on #ifItWasReal", tone: "mysterious" },
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
      const sceneList = sceneTags.join(", ");
      const platformNote = platform === "instagram"
        ? "Instagram (polish, aesthetics, aspirational)"
        : "TikTok (punchy, trend-aware, Gen Z tone)";

      const prompt = `You are a social media copywriter for a luxury lifestyle brand.
Generate exactly 4 captions for a ${platformNote} post featuring: ${sceneList}.
Rules:
- Each caption must be a SHORT PHRASE or fragment, never a full grammatical sentence.
- Each caption must end with 1-2 inline hashtags that fit the vibe (e.g. #larp, #delulu, #mainCharacterEnergy, #ifItWasReal, #pluggedIn) — never a hashtag that implies real income, net worth, or earnings (do NOT use things like #money, #rich, #networth, #cashout).
- Use trendy, slang-y, self-aware wording — this is a joke about "larping" a lifestyle, not a promise of real money or success.
- No brand names.
Return ONLY a JSON array:
[{"text":"...","tone":"understated"},{"text":"...","tone":"aspirational"},{"text":"...","tone":"humorous"},{"text":"...","tone":"mysterious"}]`;

      captions = await callGeminiJSON(prompt) as Caption[];
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
