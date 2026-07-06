import { NextResponse } from "next/server";
import { STYLES } from "@/lib/generation/styles";

// Public — no auth. Safe to call before login (home picker needs it pre-signup).
export async function GET() {
  return NextResponse.json({
    styles: STYLES.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      previewEmoji: s.previewEmoji,
    })),
  });
}
