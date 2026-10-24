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

const MOCK_SLIDES = [
  { bg: "e9e1d3", text: "5 things that saved my finals" },
  { bg: "d8dfd6", text: "Study in 50-minute blocks, then actually leave the desk" },
  { bg: "dcd6e4", text: "Make a one-page cheat sheet even if you can't use it" },
  { bg: "e4dad2", text: "Teach the hardest topic to a friend out loud" },
  { bg: "d6dde4", text: "Sleep beats one more all-nighter" },
  { bg: "e2e0d0", text: "Plan tomorrow before you close the laptop" },
];

export const mockJobComplete: JobPollingResponse = {
  jobId: "gen_mock001",
  status: "complete",
  platform: "instagram",
  format: "slideshow",
  post: {
    brief: "5 study tips that got me through finals week",
    title: "Finals week survival",
    hashtags: ["studytok", "finalsweek", "studytips"],
  },
  assets: MOCK_SLIDES.map((s, i) => ({
    id: `ast_0${i + 1}`,
    type: "image" as const,
    url: `https://placehold.co/1080x1350/${s.bg}/0b0b0c`,
    thumbUrl: `https://placehold.co/540x675/${s.bg}/0b0b0c`,
    width: 1080,
    height: 1350,
    sceneTag: `slide_0${i + 1}`,
    slideText: s.text,
    rerollable: true,
  })),
  captions: [
    { id: "cap_1", text: "saving this for every exam season", tone: "relatable" },
    { id: "cap_2", text: "tip 3 is the one nobody talks about", tone: "curious" },
    { id: "cap_3", text: "send this to your study group", tone: "helpful" },
  ],
  sounds: [
    {
      id: "snd_1",
      title: "No One Noticed — The Marías",
      meta: "dreamy",
      platform: "instagram",
      openUrl: "https://open.spotify.com/search/No%20One%20Noticed%20The%20Mar%C3%ADas",
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
