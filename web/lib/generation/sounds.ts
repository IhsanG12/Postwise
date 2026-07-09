import type { PlatformType } from "@/lib/types";
import { callGeminiJSON } from "./gemini";

const PROVIDER: "hardcoded" | "gemini" = "gemini";

interface SoundSuggestion {
  title: string;
  meta: string;
  openUrl: string;
}

const FALLBACK_SOUNDS: Record<PlatformType, SoundSuggestion[]> = {
  instagram: [
    {
      title: "luxury ambient (sped up)",
      meta: "trending · +340% this week",
      openUrl: "https://www.instagram.com/reels/audio/luxury-ambient",
    },
    {
      title: "silent night (lo-fi remix)",
      meta: "trending · 2.1M reels",
      openUrl: "https://www.instagram.com/reels/audio/silent-night-lofi",
    },
    {
      title: "cinematic rise",
      meta: "trending · +180% this week",
      openUrl: "https://www.instagram.com/reels/audio/cinematic-rise",
    },
  ],
  tiktok: [
    {
      title: "rich girl era (slowed)",
      meta: "trending · 4.7M videos",
      openUrl: "https://www.tiktok.com/music/rich-girl-era",
    },
    {
      title: "levitating (luxury edit)",
      meta: "trending · +290% this week",
      openUrl: "https://www.tiktok.com/music/levitating-luxury",
    },
    {
      title: "aesthetic morning routine",
      meta: "trending · 8.2M videos",
      openUrl: "https://www.tiktok.com/music/aesthetic-morning",
    },
  ],
};

export async function saveSounds(
  jobId: string,
  platform: PlatformType,
  sceneTags: string[],
  db: any
): Promise<void> {
  let suggestions: SoundSuggestion[] = FALLBACK_SOUNDS[platform];

  if (PROVIDER === "gemini") {
    try {
      const sceneList = sceneTags.join(", ");
      const platformNote = platform === "instagram" ? "Instagram Reels" : "TikTok";

      const prompt = `You suggest trending-sound picks for a ${platformNote} post featuring: ${sceneList}.
Generate exactly 3 plausible trending-sound suggestions that would fit this luxury-lifestyle content.
Each needs:
- "title": a short, real-sounding track/audio name (e.g. style, mood, or a known-sounding edit name).
- "meta": a short trending stat in this platform's usual style (e.g. "trending · +250% this week" or "trending · 3.4M videos").
- "openUrl": a plausible ${platformNote} audio-page URL for that title.
Return ONLY a JSON array:
[{"title":"...","meta":"...","openUrl":"..."}]`;

      suggestions = await callGeminiJSON(prompt) as SoundSuggestion[];
    } catch (err) {
      console.error("[sounds] Gemini generation failed, falling back to hardcoded sounds", err);
      suggestions = FALLBACK_SOUNDS[platform];
    }
  }

  const rows = suggestions.map((s) => ({
    job_id: jobId,
    title: s.title,
    meta: s.meta,
    platform,
    open_url: s.openUrl,
  }));

  const { error } = await db.from("sounds").insert(rows);
  if (error) throw new Error(`Failed to save sounds: ${JSON.stringify(error)}`);
}
