export async function fetchWeeklyUploadsCount(playlistId: string, weekStartDateStr: string): Promise<number> {
  const apiKey = (process.env.YOUTUBE_API_KEY || "").trim();
  if (!apiKey) {
    console.warn(`[YouTube Mock] Fetching uploads for playlist ${playlistId}. Returning mock count.`);
    if (playlistId.includes("inactive") || playlistId.includes("block")) {
      return 0;
    }
    return 2;
  }

  let targetPlaylistId = playlistId;
  if (playlistId.startsWith("UC")) {
    targetPlaylistId = "UU" + playlistId.substring(2);
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.append("key", apiKey);
  url.searchParams.append("playlistId", targetPlaylistId);
  url.searchParams.append("part", "snippet");
  url.searchParams.append("maxResults", "50");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      const items = data.items || [];
      
      // Filter items added to the playlist after the week start date
      const weekStartDate = new Date(weekStartDateStr);
      const weeklyItems = items.filter((item: any) => {
        const publishedAt = new Date(item.snippet?.publishedAt);
        return publishedAt >= weekStartDate;
      });

      return weeklyItems.length;
    } else {
      const errText = await response.text();
      console.error(`YouTube API Error: ${errText}`);
      return 2; // Fallback
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`YouTube fetch exception:`, error);
    return 2; // Fallback
  }
}

export async function fetchChannelStats(channelId: string): Promise<{
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  title: string;
  thumbnail: string;
  isMock: boolean;
  apiError?: string;
}> {
  const apiKey = (process.env.YOUTUBE_API_KEY || "").trim();
  if (!apiKey) {
    console.warn(`[YouTube Mock] Fetching stats for channel ${channelId}. Returning mock values.`);
    return {
      subscriberCount: 850,
      viewCount: 45000,
      videoCount: 45,
      title: "Cosmo Alma TV (Simulado)",
      thumbnail: "",
      isMock: true,
    };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.append("key", apiKey);
  url.searchParams.append("id", channelId);
  url.searchParams.append("part", "statistics,snippet");

  const statsController = new AbortController();
  const statsTimeoutId = setTimeout(() => statsController.abort(), 4000);

  try {
    const response = await fetch(url.toString(), { signal: statsController.signal });
    clearTimeout(statsTimeoutId);
    if (response.ok) {
      const data = await response.json();
      const channel = data.items?.[0];
      if (!channel) {
        throw new Error("Canal não encontrado no YouTube.");
      }
      const stats = channel.statistics || {};
      return {
        subscriberCount: parseInt(stats.subscriberCount) || 0,
        viewCount: parseInt(stats.viewCount) || 0,
        videoCount: parseInt(stats.videoCount) || 0,
        title: channel.snippet?.title || "Cosmo Alma TV",
        thumbnail: channel.snippet?.thumbnails?.default?.url || "",
        isMock: false,
      };
    } else {
      const errText = await response.text();
      let parsedMsg = errText;
      try {
        const parsedJson = JSON.parse(errText);
        parsedMsg = parsedJson.error?.message || errText;
      } catch (_) {}
      throw new Error(`Erro na API do YouTube: ${parsedMsg}`);
    }
  } catch (err: any) {
    clearTimeout(statsTimeoutId);
    console.error("YouTube stats fetch exception:", err);
    return {
      subscriberCount: 850,
      viewCount: 45000,
      videoCount: 45,
      title: "Cosmo Alma TV (Fallback)",
      thumbnail: "",
      isMock: true,
      apiError: err.message || "Erro desconhecido",
    };
  }
}
