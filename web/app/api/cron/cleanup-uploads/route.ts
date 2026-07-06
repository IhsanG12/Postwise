import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredUploads } from "@/lib/cleanup";

// Selfies must not outlive their TTL (CLAUDE.md safety rule #6). Vercel Cron
// hits this on a schedule (see vercel.json); protected by CRON_SECRET so it
// can't be triggered by anyone else.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await deleteExpiredUploads();
  return NextResponse.json(result);
}
