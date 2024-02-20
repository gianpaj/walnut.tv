import axios from "axios";

// This function won't work because reddit denies requests from the server
export async function fetchRedditVideos({
  subreddit,
  listing,
  minUpvotes = 0,
  limit = 50,
}: {
  subreddit: string;
  listing: string;
  minUpvotes: number;
  limit: number;
}) {
  try {
    const response = await axios.get(
      `https://www.reddit.com/r/${subreddit}/${listing}.json?limit=${limit}`,
    );
    const data: RedditPost[] = (response.data as RedditResponseData).data
      .children;
    const filteredVideos = data.filter((item) => {
      return item.data.score >= minUpvotes && !item.data.url.includes("reddit");
    });
    return filteredVideos;
    return [];
  } catch (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
}
