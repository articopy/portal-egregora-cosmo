import { NextResponse } from "next/server";
import { runWeeklyYoutubeAudit } from "@/lib/services/cron";

export async function POST(request: Request) {
  try {
    let overrides = null;
    try {
      const body = await request.json();
      overrides = body?.overrides || null;
    } catch {
      // Body may be empty
    }

    const result = await runWeeklyYoutubeAudit(overrides);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Cron YouTube execution error:", err);
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
