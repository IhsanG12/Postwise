// The brief: the creator's one-line description of a post. Shared by the
// home page (live validation) and POST /api/generations (the real check),
// so both agree on what a usable brief is.

export const BRIEF_MIN_LENGTH = 8;
export const BRIEF_MAX_LENGTH = 400;

export const BRIEF_EXAMPLES = [
  "5 study tips that got me through finals week",
  "My Sunday reset routine in a tiny dorm room",
  "A cheap 20-minute pasta I make every week",
  "What I packed for a 3-day hiking trip",
  "Beginner gym day: what I actually do",
];

export function cleanBrief(brief: string): string {
  return brief.replace(/\s+/g, " ").trim();
}

/** Returns a message for the creator if the brief can't be used, otherwise null. */
export function validateBrief(brief: unknown): string | null {
  if (typeof brief !== "string") return "brief is required.";
  const cleaned = cleanBrief(brief);
  if (cleaned.length < BRIEF_MIN_LENGTH) return `brief must be at least ${BRIEF_MIN_LENGTH} characters.`;
  if (cleaned.length > BRIEF_MAX_LENGTH) return `brief must be at most ${BRIEF_MAX_LENGTH} characters.`;
  return null;
}
