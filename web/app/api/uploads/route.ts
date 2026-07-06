import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const EXPIRES_IN_SECONDS = 600;     // 10 minutes

// Selfies are the user's own face, used only for generation, then deleted.
// Never persisted beyond the job that consumes them. See safety rule #6 in CLAUDE.md.

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_upload", message: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "invalid_upload", message: "Missing file field." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "invalid_upload", message: "Only jpg, png, and webp images are accepted." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "invalid_upload", message: "File exceeds 10 MB limit." }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const storagePath = `${user.id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const db = supabase as any;

  const { error: storageError } = await supabase.storage
    .from("selfies")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (storageError) {
    console.error("[/api/uploads] Storage error", storageError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + EXPIRES_IN_SECONDS * 1000).toISOString();

  const { data, error: dbError } = await db
    .from("uploads")
    .insert({ user_id: user.id, url: storagePath, expires_at: expiresAt })
    .select("id")
    .single() as { data: { id: string } | null; error: unknown };

  if (dbError || !data) {
    console.error("[/api/uploads] DB error", dbError);
    // Clean up the file we just uploaded since we can't track it.
    await supabase.storage.from("selfies").remove([storagePath]);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(
    { uploadId: `upl_${data.id}`, expiresInSeconds: EXPIRES_IN_SECONDS },
    { status: 201 }
  );
}
