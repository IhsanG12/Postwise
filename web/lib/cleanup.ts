import { supabase, db } from "./supabase";

// Deletes selfie uploads that have passed their expiry time (10 minutes).
// Runs after every upload and every new generation, plus once a day from the
// cron route as a backstop (Vercel's free plan only allows daily crons).
// Selfies must not outlive their TTL — see safety rule #6 in CLAUDE.md.
export async function deleteExpiredUploads(): Promise<{ deleted: number; errors: number }> {
  const { data: expired, error: fetchError } = await db
    .from("uploads")
    .select("id, url")
    .lt("expires_at", new Date().toISOString())
    .is("deleted_at", null) as { data: { id: string; url: string }[] | null; error: unknown };

  if (fetchError || !expired?.length) {
    if (fetchError) console.error("[cleanup] Failed to fetch expired uploads", fetchError);
    return { deleted: 0, errors: fetchError ? 1 : 0 };
  }

  let deleted = 0;
  let errors = 0;

  for (const upload of expired) {
    const { error: storageError } = await supabase.storage
      .from("selfies")
      .remove([upload.url]);

    if (storageError) {
      console.error("[cleanup] Failed to delete storage file", upload.url, storageError);
      errors++;
      continue;
    }

    const { error: dbError } = await db
      .from("uploads")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", upload.id);

    if (dbError) {
      console.error("[cleanup] Failed to mark upload deleted", upload.id, dbError);
      errors++;
    } else {
      console.log("[cleanup] Deleted selfie upload", upload.id);
      deleted++;
    }
  }

  return { deleted, errors };
}
