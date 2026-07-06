import type { PlatformType } from "@/lib/types";

interface SoundSuggestion {
  title: string;
  meta: string;
  openUrl: string;
}

const SOUNDS: Record<PlatformType, SoundSuggestion[]> = {
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
  db: any
): Promise<void> {
  const suggestions = SOUNDS[platform];

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
