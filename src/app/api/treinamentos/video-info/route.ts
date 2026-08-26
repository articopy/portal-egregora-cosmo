import { NextRequest, NextResponse } from 'next/server';

function parseISODurationToMinutes(isoDuration: string): number {
  if (!isoDuration) return 0;
  // Format: PT#H#M#S or PT#M#S or PT#S
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);
  const totalMinutes = hours * 60 + minutes + (seconds > 30 ? 1 : 0);
  return totalMinutes > 0 ? totalMinutes : 1;
}

function extractYouTubeId(url: string): string {
  if (!url) return '';
  if (url.includes('v=')) {
    return url.split('v=')[1]?.split('&')[0] || '';
  }
  if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1]?.split('?')[0] || '';
  }
  if (url.includes('embed/')) {
    return url.split('embed/')[1]?.split('?')[0] || '';
  }
  if (url.includes('shorts/')) {
    return url.split('shorts/')[1]?.split('?')[0] || '';
  }
  return url.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { url, provider } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL do vídeo é obrigatória' }, { status: 400 });
    }

    const detectedProvider = provider || (url.includes('vimeo.com') ? 'vimeo' : 'youtube');

    // 1. YOUTUBE
    if (detectedProvider === 'youtube') {
      const videoId = extractYouTubeId(url);
      if (!videoId) {
        return NextResponse.json({ error: 'ID do YouTube não identificado' }, { status: 400 });
      }

      const apiKey = process.env.YOUTUBE_API_KEY || '';
      let durationMinutes = 0;
      let title = '';
      let description = '';
      let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      if (apiKey) {
        try {
          const ytRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${apiKey}`
          );
          const ytData = await ytRes.json();
          if (ytData.items && ytData.items.length > 0) {
            const item = ytData.items[0];
            const iso = item.contentDetails?.duration;
            durationMinutes = parseISODurationToMinutes(iso);
            title = item.snippet?.title || '';
            description = item.snippet?.description || '';
            thumbnailUrl =
              item.snippet?.thumbnails?.maxres?.url ||
              item.snippet?.thumbnails?.high?.url ||
              thumbnailUrl;
          }
        } catch (ytErr) {
          console.warn('Erro ao consultar YouTube Data API:', ytErr);
        }
      }

      return NextResponse.json({
        success: true,
        provider: 'youtube',
        videoId,
        durationMinutes: durationMinutes || 0,
        title,
        description,
        thumbnailUrl
      });
    }

    // 2. VIMEO
    if (detectedProvider === 'vimeo') {
      let durationMinutes = 0;
      let title = '';
      let description = '';
      let thumbnailUrl = '';

      try {
        const vimeoRes = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
        if (vimeoRes.ok) {
          const vimeoData = await vimeoRes.json();
          const durationSeconds = vimeoData.duration || 0;
          durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
          title = vimeoData.title || '';
          description = vimeoData.description || '';
          thumbnailUrl = vimeoData.thumbnail_url || '';
        }
      } catch (vimErr) {
        console.warn('Erro ao consultar Vimeo oEmbed:', vimErr);
      }

      return NextResponse.json({
        success: true,
        provider: 'vimeo',
        durationMinutes: durationMinutes || 0,
        title,
        description,
        thumbnailUrl
      });
    }

    return NextResponse.json({ error: 'Provedor desconhecido' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro na API de video-info:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
