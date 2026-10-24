import type { Db } from "@/lib/supabase";
import type { PlannedCaption } from "./plan";

// Captions are written by the planner (plan.ts) together with the slides, so
// they're about what the post actually shows. This just stores them.
export async function saveCaptions(jobId: string, captions: PlannedCaption[], db: Db): Promise<void> {
  const rows = captions.map((c) => ({ job_id: jobId, text: c.text, tone: c.tone }));
  const { error } = await db.from("captions").insert(rows);
  if (error) throw new Error(`Failed to save captions: ${JSON.stringify(error)}`);
}
