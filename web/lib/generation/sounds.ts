import type { Db } from "@/lib/supabase";
import type { PlatformType } from "@/lib/types";
import type { Vibe } from "./plan";

interface SoundSuggestion {
  title: string;
  meta: string;
  openUrl: string;
}

interface RealSong {
  title: string;
  artist: string;
  vibe: Vibe;
}

// Real, currently-circulating songs (per TikTok/Instagram trend roundups as of
// July 2026) — every title/artist here is a real, searchable track. No
// invented names, no fabricated "trending" stats, no guessed-at audio-page URLs.
const REAL_SONGS: Record<PlatformType, RealSong[]> = {
  tiktok: [
    { title: "Material Lover", artist: "Sienna Spiro", vibe: "confident" },
    { title: "No One Noticed", artist: "The Marías", vibe: "dreamy" },
    { title: "REDRED", artist: "CORTIS", vibe: "party" },
    { title: "Dai Dai", artist: "Shakira & Burna Boy", vibe: "vacation" },
    { title: "How You Like Me Now", artist: "The Heavy", vibe: "confident" },
    { title: "Melisa I'm Drunk And Outside", artist: "Afroplugs", vibe: "party" },
    { title: "Moment Of Reflection", artist: "jhonatan, Piano Sky & Dee Piano", vibe: "cinematic" },
    { title: "The Fifth of May", artist: "Zach Bryan", vibe: "nostalgic" },
    { title: "PRESSURE!", artist: "Nyck Caution", vibe: "confident" },
    { title: "i just get so nervy (super slowed)", artist: "HYFY", vibe: "moody" },
    { title: "Espresso", artist: "Sabrina Carpenter", vibe: "confident" },
    { title: "Golden Brown (Slowed Down Version)", artist: "The Stranglers", vibe: "nostalgic" },
  ],
  instagram: [
    { title: "summer on the inside", artist: "Warner Case, Jean Tonique & Max Kaluz", vibe: "vacation" },
    { title: "Espresso", artist: "Sabrina Carpenter", vibe: "confident" },
    { title: "Golden Brown (Slowed Down Version)", artist: "The Stranglers", vibe: "nostalgic" },
    { title: "Young Hearts Run Free (45 Version)", artist: "Candi Staton", vibe: "nostalgic" },
    { title: "Careless Whisper (slowed)", artist: "George Michael", vibe: "moody" },
    { title: "Sunny", artist: "Boney M. & R3HAB", vibe: "vacation" },
    { title: "Game Time", artist: "Future & Tyla", vibe: "party" },
    { title: "Ray Mysterio", artist: "The Alchemist", vibe: "cinematic" },
    { title: "I Knew It, I Knew You", artist: "Taylor Swift", vibe: "dreamy" },
    { title: "Respect", artist: "Aretha Franklin", vibe: "confident" },
    { title: "Bed on Fire", artist: "G Flip", vibe: "party" },
    { title: "No One Noticed", artist: "The Marías", vibe: "dreamy" },
    { title: "Material Lover", artist: "Sienna Spiro", vibe: "confident" },
  ],
};

function openUrlFor(platform: PlatformType, title: string, artist: string): string {
  const query = encodeURIComponent(`${title} ${artist}`);
  // TikTok's own search is real and functional. Instagram doesn't expose a
  // reliable unauthenticated search endpoint to link to, so point to Spotify
  // search instead — a real, working link to the actual song, rather than a
  // guessed-at Instagram URL that just 200s on the app shell without
  // actually resolving to anything (the exact kind of fake link this
  // replaces).
  return platform === "tiktok"
    ? `https://www.tiktok.com/search?q=${query}`
    : `https://open.spotify.com/search/${query}`;
}

// The planner picks the post's vibe; songs with that vibe come first.
export function pickSounds(platform: PlatformType, vibe: Vibe, count: number): SoundSuggestion[] {
  const pool = REAL_SONGS[platform];
  const matched = pool.filter((s) => s.vibe === vibe);
  const rest = pool.filter((s) => !matched.includes(s));

  // Prioritize songs matching the job's vibe, then top up with the rest of
  // the real pool — some vibes only have 1-2 curated songs, so a strict
  // vibe-only filter would under-fill instead of just being less targeted.
  const shuffled = [
    ...matched.sort(() => Math.random() - 0.5),
    ...rest.sort(() => Math.random() - 0.5),
  ];
  return shuffled.slice(0, count).map((song) => ({
    title: `${song.title} — ${song.artist}`,
    meta: song.vibe,
    openUrl: openUrlFor(platform, song.title, song.artist),
  }));
}

export async function saveSounds(
  jobId: string,
  platform: PlatformType,
  vibe: Vibe,
  db: Db
): Promise<void> {
  const suggestions = pickSounds(platform, vibe, 3);

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
