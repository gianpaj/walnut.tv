import VideoDisplay from "@/components/VideoDisplay";
import type { FeedIssue } from "@/lib/actions/feed";
import { fetchChannelVideos } from "@/lib/actions/videos";
import { getYouTubeChannelIds, type Channel } from "@/lib/data";
import { REDDIT_ENABLED } from "@/lib/features";

interface Props {
  channel: Channel;
  /** Base path for deep links. Defaults to /{channel.title}. */
  urlPrefix?: string;
  initialVideoId?: string;
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[60vh] items-center justify-center px-6">
      <h2 className="text-center text-xl font-medium text-muted-foreground">{children}</h2>
    </div>
  );
}

const YOUTUBE_ISSUE_MESSAGES: Record<FeedIssue["reason"], string> = {
  "missing-config": "YouTube browsing is unavailable because it is not configured.",
  "api-denied": "YouTube denied access to the requested videos.",
  "quota-exceeded": "YouTube's API quota has been reached. Please try again later.",
  "fetch-failed": "Some YouTube videos could not be retrieved. Please try again later.",
};

/** Fetch enabled sources on the server so the video list arrives with the HTML. */
const ChannelView = async ({ channel, urlPrefix, initialVideoId }: Props) => {
  if (
    !REDDIT_ENABLED &&
    channel.subreddit !== undefined &&
    getYouTubeChannelIds(channel).length === 0
  ) {
    return <Message>Reddit browsing is temporarily unavailable.</Message>;
  }

  const { videos, issues } = await fetchChannelVideos(channel);
  const issueMessages = [
    ...new Set(
      issues.map((issue) =>
        issue.source === "youtube"
          ? YOUTUBE_ISSUE_MESSAGES[issue.reason]
          : "Reddit videos could not be retrieved. Please try again later.",
      ),
    ),
  ].join(" ");

  if (videos.length === 0) {
    return (
      <Message>
        {issueMessages || `No videos are available in /${channel.title}. Try another channel.`}
      </Message>
    );
  }

  return (
    <>
      {issues.length > 0 && (
        <p role="status" className="px-6 py-3 text-sm text-muted-foreground">
          Showing available videos. {issueMessages}
        </p>
      )}
      <VideoDisplay
        videos={videos}
        urlPrefix={urlPrefix ?? `/${channel.title}`}
        initialVideoId={initialVideoId}
      />
    </>
  );
};

export default ChannelView;
