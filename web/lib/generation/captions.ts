import type { PlatformType } from "@/lib/types";
import { callGeminiJSON } from "./gemini";

const PROVIDER: "hardcoded" | "gemini" = "gemini";

interface Caption {
  text: string;
  tone: string;
}

const FALLBACK_CAPTIONS: Caption[] = [
  { text: "just a tuesday", tone: "understated" },
  { text: "larping so hard I almost believe it", tone: "humorous" },
  { text: "rent's due but make it look like it's not", tone: "aspirational" },
  { text: "if the algorithm asks, yes this is real", tone: "mysterious" },
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

      const prompt = `You are a social media copywriter for a Gen Z audience, writing captions for a ${platformNote} post featuring: ${sceneList}.

Context on the joke: "larping" here means dry, self-aware role-play of a lifestyle you don't
actually have — think "bro is larping as a CEO", "rich girl larping", "larping confidence."
It's deadpan and in on its own joke, not an exclamation-point flex. It is NOT the same as
generic delulu/manifestation-speak or stacking trend hashtags like #mainCharacterEnergy —
that reads as try-hard, not larpy.
Rules:
- Each caption must be a SHORT PHRASE or fragment, never a full grammatical sentence.
- Dry, deadpan, self-aware tone — the joke is that it's obviously not real, said completely straight.
- At most ONE hashtag, and only if it actually adds something — plenty of good captions use zero.
  Never a stacked string of hashtags. Never a hashtag that implies real income, net worth, or
  earnings (no #money, #rich, #networth, #cashout).
- Do NOT use tired filler: "main character energy", "grind arc", "delulu", "unlocked", "era" as a suffix.
- Prefer working the word "larp"/"larping" naturally into the sentence itself over hashtag-only jokes.
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
