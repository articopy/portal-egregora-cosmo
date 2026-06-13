import { NextResponse } from "next/server";
import { fetchWeeklyUploadsCount } from "@/lib/services/youtube";

export async function POST(request: Request) {
  try {
    let youtubeChannelId = "UCF0p5j1QEYT4jM-8Ttg86tA"; // Default YouTube Channel (Google Developers) for testing if not specified
    try {
      const body = await request.json();
      if (body && body.youtubeChannelId) {
        youtubeChannelId = body.youtubeChannelId;
      }
    } catch {
      // Body may be empty, use default channel ID
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekStartDateStr = sevenDaysAgo.toISOString();

    const count = await fetchWeeklyUploadsCount(youtubeChannelId, weekStartDateStr);
    const isMock = !process.env.YOUTUBE_API_KEY;

    return NextResponse.json({
      success: true,
      mode: isMock ? "Simulação (Chave de API ausente)" : "API Real (Google Cloud)",
      channel_id: youtubeChannelId,
      uploads_count: count,
      period_start: weekStartDateStr,
      message: `Consulta ao YouTube concluída com sucesso! Canal com ${count} vídeos enviados nos últimos 7 dias.`
    });
  } catch (err: any) {
    console.error("[Test YouTube] Endpoint error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Erro desconhecido ao consultar API do YouTube."
    }, { status: 500 });
  }
}
