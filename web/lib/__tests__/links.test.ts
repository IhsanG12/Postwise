import { describe, expect, it } from "vitest";
import { editPostHref } from "../links";

describe("editPostHref", () => {
  it("round-trips a brief with spaces and symbols", () => {
    const href = editPostHref({ platform: "tiktok", format: "slideshow", withFace: false, brief: "pasta & 20 min?" });
    const params = new URL(href, "http://x").searchParams;
    expect(params.get("brief")).toBe("pasta & 20 min?");
    expect(params.get("withFace")).toBe("false");
  });

  it("returns the bare home page when nothing is set", () => {
    expect(editPostHref({})).toBe("/");
  });
});
