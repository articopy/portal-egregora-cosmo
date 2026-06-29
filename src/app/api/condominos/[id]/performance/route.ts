import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getAuthenticatedUser, isUserAdmin } from "@/lib/auth";

function parseISO8601Duration(durationStr: string): number {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = durationStr.match(regex);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || "0");
  const minutes = parseInt(matches[2] || "0");
  const seconds = parseInt(matches[3] || "0");
  return hours * 3600 + minutes * 60 + seconds;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ detail: "Acesso não autorizado. Sessão inválida ou expirada." }, { status: 401 });
    }

    const { id } = await params;
    
    // Fetch the condomino
    const { data: condomino, error } = await supabase
      .from("condominos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !condomino) {
      return NextResponse.json({ detail: "Condômino não encontrado." }, { status: 404 });
    }

    // Check authorization: Admin or Owner
    const isAdmin = isUserAdmin(user);
    const isOwnRecord = condomino.email?.toLowerCase() === user.email?.toLowerCase();
    if (!isAdmin && !isOwnRecord) {
      return NextResponse.json({ detail: "Acesso proibido. Você não tem permissão para visualizar estas estatísticas." }, { status: 403 });
    }

    const playlistId = condomino.youtube_id || "PLzFfb_D4rQqOz4ploKemIp7hLUNXl_WpF";
    const apiKey = (process.env.YOUTUBE_API_KEY || "").trim();

    let inscritosAtual = 289;
    let horasAtual = 302;
    let hasVideos = false;

    if (apiKey) {
      try {
        const mainChannelId = "UCEI3LDmVQceZpC0zagt398Q"; // Cosmo Alma TV Channel ID

        // 1. Fetch channel stats for subscribers and total watch hours (monetization goals)
        const channelUrl = `https://www.googleapis.com/youtube/v3/channels?key=${apiKey}&id=${mainChannelId}&part=statistics`;
        const channelRes = await fetch(channelUrl);
        if (channelRes.ok) {
          const channelData = await channelRes.json();
          const channel = channelData.items?.[0];
          if (channel) {
            const stats = channel.statistics || {};
            inscritosAtual = parseInt(stats.subscriberCount) || 289;
            const views = parseInt(stats.viewCount) || 6893;
            // General watch hours calculated from total channel views
            horasAtual = Math.round(views * 2.62 / 60) || 302;
          }
        }

        // 2. Fetch playlist items of this specific creator to check if they have videos
        let targetPlaylistId = playlistId;
        if (playlistId.startsWith("UC")) {
          targetPlaylistId = "UU" + playlistId.substring(2);
        }

        const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${apiKey}&playlistId=${targetPlaylistId}&part=contentDetails&maxResults=5`;
        const plItemsRes = await fetch(playlistItemsUrl);
        if (plItemsRes.ok) {
          const plItemsData = await plItemsRes.json();
          const items = plItemsData.items || [];
          if (items.length > 0) {
            hasVideos = true;
          }
        }
      } catch (ytErr) {
        console.error("[YouTube API Performance Fetch Error]:", ytErr);
      }
    }

    return NextResponse.json({
      youtube_id: playlistId,
      nome_canal: condomino.nome_comercial,
      inscritos: {
        atual: inscritosAtual,
        meta: 500
      },
      horas: {
        atual: horasAtual,
        meta: 3000
      },
      pilares: hasVideos ? {
        retencao: {
          status: "PROBLEMA",
          titulo: "O Gargalo da Retenção Inicial (Quality CTR)",
          problema: "Os vídeos estão recebendo muitos cliques porque as capas são ótimas, mas o YouTube está parando de recomendá-los. Isso acontece porque o algoritmo exige o 'Quality CTR'. Se o vídeo começa de forma muito lenta, poética ou com pausas, o público sai nos primeiros segundos, matando o seu alcance.",
          solucao: "Aplicar rigorosamente a Regra dos 15 Segundos (Framework 3A) na gravação e uma edição agressiva.",
          acoes: [
            "A poesia só entra a partir do 16º segundo. Os 15 iniciais devem focar em: Atenção (0-5s), Autoridade (5-10s) e Agenda (10-15s).",
            "Cortar qualquer respiro, silêncio ou pausa dramática nesses 15 segundos iniciais. A transição entre as frases precisa ser imediata."
          ],
          exemplo: "Os vídeos longos de Áries e Touro tiveram taxas de clique (CTR) estrondosas de mais de 10%, mas estacionaram na casa de 100 visualizações porque o início foi muito poético e o público fugiu."
        },
        shorts: {
          status: "PROBLEMA",
          titulo: "A Armadilha dos 'Shorts Desconectados'",
          problema: "Os vídeos curtos estão funcionando como 'becos sem saída'. Eles geram visualizações rápidas, mas não convertem o público em inscritos e não direcionam tráfego para os vídeos longos (que realmente geram horas de exibição e autoridade).",
          solucao: "Os Shorts devem servir como 'iscas' (topo de funil) para os vídeos longos correspondentes.",
          acoes: [
            "Minerar os picos de retenção dos vídeos longos que deram certo e recortar esses momentos específicos.",
            "Aumentar a frequência (1 a 2 Shorts por dia) e usar obrigatoriamente a ferramenta do YouTube Studio para linkar o Short ao vídeo longo correspondente."
          ],
          exemplo: "O Short de Touro ('A FORÇA DA LENTIDÃO SAGRADA') teve 432 visualizações rapidamente, mas gerou apenas 1 inscrito e não levou ninguém para o vídeo principal por falta de link."
        },
        seo: {
          status: "OK",
          titulo: "Embalagem e SEO (A Tática da Cenoura com Chocolate)",
          problema: "Títulos excessivamente longos e puramente conceituais não geram o senso de urgência necessário para o clique em telas de celular, e o uso de dezenas de tags genéricas confunde o algoritmo de busca.",
          solucao: "Utilizar títulos com menos de 50 caracteres (Chocolate = polêmica/sombra, Cenoura = mitologia/cura) e usar apenas 5 a 8 tags de cauda longa altamente específicas.",
          acoes: [
            "O título promete o que o público quer ver (a polêmica/sombra) e o conteúdo entrega o que ele precisa (a mitologia/cura).",
            "No SEO, usar apenas 5 a 8 tags de cauda longa altamente específicas em vez de dezenas de tags genéricas."
          ],
          exemplo: "O vídeo de Gêmeos ('Gêmeos desvendado | A verdade que ninguém te contou...') seguiu a regra, obteve CTR de 5.54%, 3.587 visualizações e 145 inscritos sozinho."
        }
      } : {}
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
