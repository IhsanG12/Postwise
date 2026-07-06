// Style anchors — every image in a slideshow job shares one of these so the
// set reads as one consistent shoot instead of unrelated generated images.
// `promptSuffix` is injected into every image prompt for the job (backend-only,
// never exposed to the frontend). The rest is presentational, safe to expose.

export interface StylePackage {
  id: string;
  name: string;
  description: string;
  colorGrade: string;
  mood: string;
  timeOfDay: string;
  cameraStyle: string;
  settingFamily: string;
  promptSuffix: string;
  previewEmoji: string;
}

export const STYLES: StylePackage[] = [
  {
    id: "golden_mediterranean",
    name: "Golden Mediterranean",
    description: "Warm golden hour, coastal luxury",
    colorGrade: "warm amber and honey tones, golden highlights",
    mood: "relaxed opulence, sun-soaked confidence",
    timeOfDay: "golden hour, late afternoon sun",
    cameraStyle: "soft natural light photography, shallow depth of field",
    settingFamily: "coastal terraces, seaside villas, yacht decks",
    promptSuffix:
      "Golden hour lighting, warm amber color grade, coastal Mediterranean villa aesthetic, " +
      "soft natural shadows, sun-drenched luxury.",
    previewEmoji: "🌅",
  },
  {
    id: "midnight_monaco",
    name: "Midnight Monaco",
    description: "Cool blue-black night, high glamour",
    colorGrade: "deep blue-black shadows, cool silver highlights",
    mood: "high glamour, exclusive nightlife energy",
    timeOfDay: "night",
    cameraStyle: "cinematic low-light photography, bokeh city lights",
    settingFamily: "city skylines, casino terraces, rooftop bars",
    promptSuffix:
      "Midnight cinematic lighting, cool blue-black color grade, glamorous nightlife city backdrop, " +
      "bokeh lights, high-contrast shadows.",
    previewEmoji: "🌃",
  },
  {
    id: "alpine_minimalist",
    name: "Alpine Minimalist",
    description: "Crisp white-grey, quiet mountain luxury",
    colorGrade: "cool white and grey tones, crisp neutral palette",
    mood: "clean, serene, quiet luxury",
    timeOfDay: "overcast daylight",
    cameraStyle: "minimalist architectural photography, flat even lighting",
    settingFamily: "mountain chalets, snow-covered terraces, modern alpine architecture",
    promptSuffix:
      "Crisp alpine daylight, cool white-grey color grade, minimalist modern chalet architecture, " +
      "soft overcast lighting, quiet luxury.",
    previewEmoji: "🏔️",
  },
  {
    id: "desert_noir",
    name: "Desert Noir",
    description: "Dusty amber tones, dramatic cinematic shadows",
    colorGrade: "dusty amber and rust tones, deep shadow contrast",
    mood: "dramatic, mysterious, cinematic tension",
    timeOfDay: "dusk",
    cameraStyle: "high-contrast cinematic photography, long shadows",
    settingFamily: "desert estates, dunes, modernist desert architecture",
    promptSuffix:
      "Desert dusk lighting, dusty amber and rust color grade, dramatic long shadows, " +
      "cinematic desert noir aesthetic.",
    previewEmoji: "🏜️",
  },
  {
    id: "riviera_pastel",
    name: "Riviera Pastel",
    description: "Soft pastels, breezy seaside chic",
    colorGrade: "soft pastel pinks, blues, and creams",
    mood: "breezy, playful, effortless chic",
    timeOfDay: "midday",
    cameraStyle: "bright airy photography, soft diffused light",
    settingFamily: "seaside cafes, striped cabanas, pastel villas",
    promptSuffix:
      "Bright pastel color grade, soft diffused midday light, breezy Riviera seaside aesthetic, " +
      "airy and light.",
    previewEmoji: "🍹",
  },
  {
    id: "matte_black_editorial",
    name: "Matte Black Editorial",
    description: "High-contrast monochrome, sleek and moody",
    colorGrade: "high-contrast monochrome, deep matte blacks",
    mood: "sleek, moody, powerful",
    timeOfDay: "night or interior",
    cameraStyle: "studio-style editorial photography, hard directional light",
    settingFamily: "private garages, dark interiors, urban studios",
    promptSuffix:
      "Matte black high-contrast color grade, hard directional studio lighting, " +
      "sleek moody editorial aesthetic.",
    previewEmoji: "⚫",
  },
  {
    id: "tropical_emerald",
    name: "Tropical Emerald",
    description: "Lush greens, humid golden resort light",
    colorGrade: "lush emerald greens, humid golden light",
    mood: "lush, exotic, resort escapism",
    timeOfDay: "late morning",
    cameraStyle: "vibrant resort photography, natural bright light",
    settingFamily: "tropical resorts, infinity pools, jungle villas",
    promptSuffix:
      "Lush tropical color grade, vibrant emerald greens, humid golden natural light, " +
      "resort escapism aesthetic.",
    previewEmoji: "🌴",
  },
  {
    id: "penthouse_dusk",
    name: "Penthouse Dusk",
    description: "Twilight purples, moody skyline glow",
    colorGrade: "twilight purple and amber tones",
    mood: "moody, upscale, introspective glamour",
    timeOfDay: "blue hour, twilight",
    cameraStyle: "moody interior photography, ambient window light",
    settingFamily: "penthouse interiors, skyline view lounges",
    promptSuffix:
      "Twilight blue-hour lighting, purple and amber color grade, moody upscale penthouse interior " +
      "aesthetic, skyline glow.",
    previewEmoji: "🌆",
  },
  {
    id: "arctic_platinum",
    name: "Arctic Platinum",
    description: "Cool silver-white tones, icy elegance",
    colorGrade: "cool silver-white tones, icy highlights",
    mood: "crisp, exclusive, cold elegance",
    timeOfDay: "bright winter daylight",
    cameraStyle: "crisp high-key photography, cool natural light",
    settingFamily: "snow lodges, icy terraces, winter estates",
    promptSuffix:
      "Cool platinum-white color grade, crisp bright winter daylight, icy elegant high-key lighting.",
    previewEmoji: "❄️",
  },
  {
    id: "vintage_gold_rush",
    name: "Vintage Gold Rush",
    description: "Warm sepia tones, old-money nostalgia",
    colorGrade: "warm sepia-gold tones, subtle film grain",
    mood: "old-money nostalgia, timeless prestige",
    timeOfDay: "late afternoon",
    cameraStyle: "vintage film photography, warm grain texture",
    settingFamily: "classic estates, vintage cars, old-world interiors",
    promptSuffix:
      "Vintage sepia-gold color grade, subtle film grain texture, old-money timeless aesthetic, " +
      "warm late-afternoon light.",
    previewEmoji: "🎞️",
  },
  {
    id: "neon_tokyo",
    name: "Neon Tokyo",
    description: "Electric neon, futuristic night energy",
    colorGrade: "vibrant neon pinks, blues, and purples",
    mood: "electric, high-energy, futuristic nightlife",
    timeOfDay: "night",
    cameraStyle: "neon-lit street photography, reflective wet-street glow",
    settingFamily: "neon city streets, rooftop nightclubs, futuristic skylines",
    promptSuffix:
      "Vibrant neon color grade, electric pink and blue city lights, futuristic night-life energy, " +
      "reflective wet-street glow.",
    previewEmoji: "🌌",
  },
  {
    id: "sunbleached_yacht",
    name: "Sunbleached Yacht",
    description: "Bright overexposed whites, nautical ease",
    colorGrade: "bright overexposed whites, high-key daylight",
    mood: "breezy, nautical, effortless wealth",
    timeOfDay: "bright midday",
    cameraStyle: "high-key nautical photography, overexposed highlights",
    settingFamily: "yacht decks, marinas, open-water backdrops",
    promptSuffix:
      "Bright high-key color grade, overexposed sun-bleached whites, nautical yacht-deck aesthetic, " +
      "crisp midday light.",
    previewEmoji: "⛵",
  },
];

export function getStyleById(id: string): StylePackage | undefined {
  return STYLES.find((s) => s.id === id);
}

export function isValidStyleId(id: unknown): id is string {
  return typeof id === "string" && STYLES.some((s) => s.id === id);
}
