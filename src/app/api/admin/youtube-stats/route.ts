import { NextResponse } from "next/server";
import { fetchChannelStats } from "@/lib/services/youtube";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch channel ID from configurations
    let channelId = "UCEI3LDmVQceZpC0zagt398Q"; // Default fallback
    
    const { data, error } = await supabase
      .from("portal_configs")
      .select("value")
      .eq("key", "youtube_channel_id")
      .maybeSingle();

    if (!error && data?.value) {
      channelId = data.value.trim();
    }

    // 2. Fetch statistics from YouTube service
    const stats = await fetchChannelStats(channelId);
    
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error("[YouTube Stats API] Error:", err);
    return NextResponse.json({
      error: err.message || "Erro desconhecido ao obter estatísticas do YouTube."
    }, { status: 500 });
  }
}
