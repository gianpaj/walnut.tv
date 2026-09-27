import VideoDisplay from "@/components/VideoDisplay";
import { fetchChannelVideos } from "@/lib/actions/videos";
import type { Channel } from "@/lib/data";

interface Props {
  channel: Channel;
  /** Base path for deep links. Defaults to /{channel.title}. */
  urlPrefix?: string;
  initialVideoId?: string;
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[60vh] items-center justify-center px-6">
      <h2 className="text-center text-xl font-medium text-muted-foreground">
        {children}
      </h2>
    </div>
  );
}

/**
 * A server component since phase 2: both Reddit and YouTube are fetched and
 * cached on the server, so the list arrives with the HTML and there is no
 * client-side loading state left to render.
 */
const ChannelView = async ({ channel, urlPrefix, initialVideoId }: Props) => {
  const { videos, failed } = await fetchChannelVideos(channel);

  if (videos.length === 0) {
    return failed ? (
      <Message>
        Sorry, there was an error retrieving videos in /{channel.title}
      </Message>
    ) : (
      // Nothing came back and nothing threw: on the YouTube channels this is
      // almost always the daily API quota being spent, which is what the live
      // site tells people too.
      <Message>
        Come back tomorrow, today&apos;s YouTube quota was used for /
        {channel.title}
      </Message>
    );
  }

  return (
    <VideoDisplay
      videos={videos}
      urlPrefix={urlPrefix ?? `/${channel.title}`}
      initialVideoId={initialVideoId}
    />
  );
};

export default ChannelView;
