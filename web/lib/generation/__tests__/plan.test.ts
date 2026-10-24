import { describe, expect, it, vi } from "vitest";
import {
  BriefRejectedError,
  fallbackPlan,
  normalizeHashtags,
  parsePlan,
  planPost,
  slideTag,
  type PlanInput,
} from "../plan";
import { validateBrief } from "@/lib/brief";

const goodRaw = {
  title: "Finals week survival",
  look: "Warm desk lamp light, cream and sage tones, late evening.",
  vibe: "dreamy",
  slides: [
    { scene: "A tidy desk with an open notebook and a mug.", text: "5 things that saved my finals" },
    { scene: "A phone timer set to 50 minutes next to a textbook.", text: "Study in 50-minute blocks" },
    { scene: "A single handwritten page of notes.", text: "Make a one-page cheat sheet" },
  ],
  captions: [
    { text: "saving this for every exam season", tone: "relatable" },
    { text: "tip 2 changed everything", tone: "curious" },
  ],
  hashtags: ["#StudyTok", "finalsweek", "study tips", "#studytok"],
};

const input: PlanInput = {
  brief: "5 study tips that got me through finals week",
  platform: "tiktok",
  format: "slideshow",
  count: 3,
  withFace: false,
};

describe("parsePlan", () => {
  it("keeps a well-formed plan and tags slides in order", () => {
    const plan = parsePlan(goodRaw, 3);
    expect(plan.title).toBe("Finals week survival");
    expect(plan.vibe).toBe("dreamy");
    expect(plan.slides.map((s) => s.tag)).toEqual(["slide_01", "slide_02", "slide_03"]);
    expect(plan.slides[0].text).toBe("5 things that saved my finals");
    expect(plan.captions).toHaveLength(2);
  });

  it("throws BriefRejectedError with the model's reason when it refuses", () => {
    const refusal = { refused: true, reason: "Postwise can't make posts about other real people." };
    expect(() => parsePlan(refusal, 3)).toThrow(BriefRejectedError);
    try {
      parsePlan(refusal, 3);
    } catch (err) {
      expect((err as BriefRejectedError).reason).toBe(refusal.reason);
    }
  });

  it("pads a short slide list instead of failing, with no text on padded slides", () => {
    const plan = parsePlan(goodRaw, 5);
    expect(plan.slides).toHaveLength(5);
    expect(plan.slides[3].text).toBe("");
    expect(plan.slides[3].scene).toContain("different angle");
    expect(plan.slides[4].tag).toBe("slide_05");
  });

  it("trims extra slides to the requested count", () => {
    expect(parsePlan(goodRaw, 2).slides).toHaveLength(2);
  });

  it("replaces an unknown vibe and unknown caption tones with safe defaults", () => {
    const plan = parsePlan(
      { ...goodRaw, vibe: "chaotic", captions: [{ text: "hi there", tone: "sarcastic" }] },
      1
    );
    expect(plan.vibe).toBe("confident");
    expect(plan.captions[0].tone).toBe("relatable");
  });

  it("caps runaway field lengths", () => {
    const plan = parsePlan(
      { ...goodRaw, slides: [{ scene: "x".repeat(5000), text: "word ".repeat(100) }] },
      1
    );
    expect(plan.slides[0].scene.length).toBeLessThanOrEqual(600);
    expect(plan.slides[0].text.length).toBeLessThanOrEqual(60); // slide 1 is the hook
  });

  it("rejects output with no usable slides or captions", () => {
    expect(() => parsePlan({ ...goodRaw, slides: [] }, 3)).toThrow("no usable slides");
    expect(() => parsePlan({ ...goodRaw, slides: [{ scene: "   " }] }, 3)).toThrow("no usable slides");
    expect(() => parsePlan({ ...goodRaw, captions: [{ text: "" }] }, 3)).toThrow("no usable captions");
    expect(() => parsePlan("not json", 3)).toThrow("not a JSON object");
    expect(() => parsePlan([goodRaw], 3)).toThrow("not a JSON object");
  });
});

describe("normalizeHashtags", () => {
  it("strips #, lowercases, removes spaces and duplicates", () => {
    expect(normalizeHashtags(goodRaw.hashtags)).toEqual(["studytok", "finalsweek", "studytips"]);
  });

  it("drops junk and keeps at most five", () => {
    expect(normalizeHashtags(["a", 42, null, "#ok", "x".repeat(40)])).toEqual(["ok"]);
    expect(normalizeHashtags(["one", "two", "three", "four", "five", "six"])).toHaveLength(5);
    expect(normalizeHashtags("studytok")).toEqual([]);
  });
});

describe("fallbackPlan", () => {
  it("builds a usable plan from the brief alone", () => {
    const plan = fallbackPlan(input.brief, 6);
    expect(plan.slides).toHaveLength(6);
    expect(plan.slides[0].text).toBe(input.brief);
    expect(plan.slides.slice(1).every((s) => s.text === "")).toBe(true);
    expect(plan.captions.length).toBeGreaterThan(0);
    expect(plan.hashtags).toContain("finals");
    expect(plan.hashtags).not.toContain("that"); // stopwords aren't hashtags
  });
});

describe("planPost", () => {
  it("returns the parsed model plan", async () => {
    const callModel = vi.fn().mockResolvedValue(goodRaw);
    const plan = await planPost(input, callModel);
    expect(plan.title).toBe("Finals week survival");
    // The brief reaches the model inside the delimited block.
    expect(callModel.mock.calls[0][0]).toContain(`"""\n${input.brief}\n"""`);
  });

  it("asks for exactly one slide for video", async () => {
    const callModel = vi.fn().mockResolvedValue(goodRaw);
    const plan = await planPost({ ...input, format: "video", count: 6 }, callModel);
    expect(plan.slides).toHaveLength(1);
    expect(callModel.mock.calls[0][0]).toContain("Return exactly 1 slide");
  });

  it("falls back when the model call fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const plan = await planPost(input, vi.fn().mockRejectedValue(new Error("503")));
    expect(plan.slides).toHaveLength(3);
    expect(plan.slides[0].text).toBe(input.brief);
  });

  it("falls back when the model returns junk", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const plan = await planPost(input, vi.fn().mockResolvedValue({ nonsense: true }));
    expect(plan.slides).toHaveLength(3);
  });

  it("does NOT fall back when the model refuses: the refusal reaches the job", async () => {
    const callModel = vi.fn().mockResolvedValue({ refused: true, reason: "No fake receipts." });
    await expect(planPost(input, callModel)).rejects.toThrow(BriefRejectedError);
  });

  it("clamps the slide count to 1–10", async () => {
    const callModel = vi.fn().mockResolvedValue(goodRaw);
    expect((await planPost({ ...input, count: 50 }, callModel)).slides).toHaveLength(10);
    expect((await planPost({ ...input, count: 0 }, callModel)).slides).toHaveLength(1);
  });
});

describe("validateBrief", () => {
  it("accepts a normal brief and rejects empty, short, long or non-string ones", () => {
    expect(validateBrief(input.brief)).toBeNull();
    expect(validateBrief("   hi   ")).toMatch(/at least/);
    expect(validateBrief("x".repeat(401))).toMatch(/at most/);
    expect(validateBrief(undefined)).toMatch(/required/);
  });
});

describe("slideTag", () => {
  it("zero-pads so tags sort in slide order", () => {
    const tags = Array.from({ length: 10 }, (_, i) => slideTag(i));
    expect([...tags].sort()).toEqual(tags);
  });
});
