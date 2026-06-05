import os
import requests
import logging

logger = logging.getLogger("youtube_service")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

def fetch_weekly_uploads_count(youtube_channel_id: str, week_start_date_str: str) -> int:
    """
    Fetches the number of videos uploaded by a YouTube channel in the last week.
    If YOUTUBE_API_KEY is not set, it returns a simulated count.
    """
    if not YOUTUBE_API_KEY:
        # Default mock: we return a simulated value (e.g., 2 videos, or we can randomize it)
        # For testing, we can check if the channel_id has specific test flags
        logger.warning(f"[YouTube Mock] Fetching uploads for channel {youtube_channel_id}. Returning mock count.")
        if "inactive" in youtube_channel_id or "block" in youtube_channel_id:
            return 0
        return 2

    # Real YouTube API Client
    # 1. Search for videos uploaded by the channel within the start date
    url = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "key": YOUTUBE_API_KEY,
        "channelId": youtube_channel_id,
        "part": "snippet",
        "order": "date",
        "publishedAfter": week_start_date_str,
        "maxResults": 10,
        "type": "video"
    }

    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", [])
            return len(items)
        else:
            logger.error(f"YouTube API Error: {response.text}")
            # Fallback to mock on API errors
            return 2
    except Exception as e:
        logger.error(f"YouTube fetch exception: {str(e)}")
        return 2
