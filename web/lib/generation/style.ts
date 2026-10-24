// Turns one slide of a post plan into the prompt sent to the image or video
// model. This replaces v1's 1,000-line catalog of hand-written luxury scenes:
// the scenes now come from the planner (plan.ts), and this file only adds the
// parts every image needs no matter what the post is about.

import type { PlatformType } from "@/lib/types";
import type { PostPlan, Slide } from "./plan";

// Slide text is shown on top of the image later, so the image itself must
// not contain any — models love to invent garbled lettering.
const PHOTO_STYLE =
  "Photorealistic, natural light, looks like a good phone photo taken by a real creator, " +
  "not a stock photo, not a 3D render, not an AI illustration. Correct anatomy, natural posture. " +
  "No text, letters, signs, logos, brand marks or watermarks anywhere in the image.";

function peopleDirective(withFace: boolean, motion: boolean): string {
  if (!withFace) {
    return "No faces in frame. Hands, objects and places are fine.";
  }
  return (
    "The person in the reference image is the creator: keep their face and identity consistent with the reference. " +
    "Dress them for this scene rather than copying the reference photo's outfit. " +
    (motion ? "They move naturally through the shot." : "")
  ).trim();
}

export function buildImagePrompt(plan: PostPlan, slide: Slide, withFace: boolean): string {
  const look = plan.look ? ` Shared look for the whole post: ${plan.look}` : "";
  return `${slide.scene}${look} ${peopleDirective(withFace, false)} ${PHOTO_STYLE}`;
}

export function buildVideoPrompt(plan: PostPlan, slide: Slide, withFace: boolean): string {
  const look = plan.look ? ` Look: ${plan.look}` : "";
  return (
    "A 5–8 second vertical video clip with smooth, natural handheld camera motion, shot on a phone. " +
    `${slide.scene}${look} ${peopleDirective(withFace, true)} ${PHOTO_STYLE}`
  );
}

export function getDimensions(platform: PlatformType): { width: number; height: number } {
  return platform === "instagram"
    ? { width: 1080, height: 1350 } // 4:5 feed post
    : { width: 1080, height: 1920 }; // 9:16
}
