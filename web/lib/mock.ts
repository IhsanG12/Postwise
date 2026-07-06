import type {
  MeResponse,
  UploadResponse,
  CreateGenerationResponse,
  JobPollingResponse,
  RerollResponse,
  CheckoutResponse,
} from "./api";

export const mockMe: MeResponse = {
  userId: "usr_mock",
  plan: "free",
  credits: 7,
  rerollsRemaining: 5,
  unlimited: false,
};

export const mockUpload: UploadResponse = {
  uploadId: "upl_mock123",
  expiresInSeconds: 600,
};

export const mockJobCreated: CreateGenerationResponse = {
  jobId: "gen_mock001",
  status: "processing",
  estimatedSeconds: 20,
  creditsCharged: 1,
};

export const mockJobProcessing: JobPollingResponse = {
  jobId: "gen_mock001",
  status: "processing",
  progress: 0.5,
};

const MOCK_SCENES = [
  { bg: "0a0910", sceneTag: "supercar_night" },
  { bg: "241d12", sceneTag: "yacht_deck" },
  { bg: "27384a", sceneTag: "rooftop_pool" },
  { bg: "3a2418", sceneTag: "private_jet" },
  { bg: "163349", sceneTag: "penthouse_view" },
  { bg: "241127", sceneTag: "hotel_lobby" },
];

export const mockJobComplete: JobPollingResponse = {
  jobId: "gen_mock001",
  status: "complete",
  platform: "instagram",
  format: "slideshow",
  assets: MOCK_SCENES.map((s, i) => ({
    id: `ast_0${i + 1}`,
    type: "image" as const,
    url: `https://placehold.co/1080x1350/${s.bg}/fafaf7`,
    thumbUrl: `https://placehold.co/540x675/${s.bg}/fafaf7`,
    width: 1080,
    height: 1350,
    sceneTag: s.sceneTag,
    rerollable: true,
  })),
  captions: [
    { id: "cap_1", text: "Just another Tuesday 🤍", tone: "understated" },
    {
      id: "cap_2",
      text: "POV: the grind finally paid off",
      tone: "aspirational",
    },
    { id: "cap_3", text: "soft life, hard launch", tone: "playful" },
  ],
  sounds: [
    {
      id: "snd_1",
      title: "luxury ambient (sped up)",
      meta: "trending · +340% this week",
      platform: "instagram",
      openUrl: "https://www.instagram.com/reels/audio/placeholder",
    },
    {
      id: "snd_2",
      title: "original sound — wang.audios",
      meta: "used in 2.1M videos",
      platform: "instagram",
      openUrl: "https://www.instagram.com/reels/audio/placeholder2",
    },
  ],
};

export const mockReroll: RerollResponse = {
  assetId: "ast_04",
  status: "processing",
  creditsCharged: 1,
  rerollsRemaining: 4,
};

export const mockCheckout: CheckoutResponse = {
  checkoutUrl: "/pricing/success",
};
