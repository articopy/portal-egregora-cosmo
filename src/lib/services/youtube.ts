const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

export async function fetchWeeklyUploadsCount(youtubeChannelId: string, weekStartDateStr: string): Promise<number> {
  if (!YOUTUBE_API_KEY) {
    console.warn(`[YouTube Mock] Fetching uploads for channel ${youtubeChannelId}. Returning mock count.`);
    if (youtubeChannelId.includes("inactive") || youtubeChannelId.includes("block")) {
      return 0;
    }
    return 2;
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.append("key", YOUTUBE_API_KEY);
  url.searchParams.append("channelId", youtubeChannelId);
  url.searchParams.append("part", "snippet");
  url.searchParams.append("order", "date");
  url.searchParams.append("publishedAfter", weekStartDateStr);
  url.searchParams.append("maxResults", "10");
  url.searchParams.append("type", "video");

  try {
    const response = await fetch(url.toString());
    if (response.ok) {
      const data = await response.json();
      const items = data.items || [];
      return items.length;
    } else {
      const errText = await response.text();
      console.error(`YouTube API Error: ${errText}`);
      return 2; // Fallback
    }
  } catch (error) {
    console.error(`YouTube fetch exception:`, error);
    return 2; // Fallback
  }
}
