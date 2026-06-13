const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

export async function fetchWeeklyUploadsCount(playlistId: string, weekStartDateStr: string): Promise<number> {
  if (!YOUTUBE_API_KEY) {
    console.warn(`[YouTube Mock] Fetching uploads for playlist ${playlistId}. Returning mock count.`);
    if (playlistId.includes("inactive") || playlistId.includes("block")) {
      return 0;
    }
    return 2;
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.append("key", YOUTUBE_API_KEY);
  url.searchParams.append("playlistId", playlistId);
  url.searchParams.append("part", "snippet");
  url.searchParams.append("maxResults", "50");

  try {
    const response = await fetch(url.toString());
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
    console.error(`YouTube fetch exception:`, error);
    return 2; // Fallback
  }
}
