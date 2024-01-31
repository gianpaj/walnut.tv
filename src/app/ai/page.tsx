import VideoDisplay from "@/components/VideoDisplay";
import { fetchYouTubeVideos } from "@/lib/actions/youtube";

const AIPage = async () => {
  const videos = await fetchYouTubeVideos({ title: "ai" });

  return (
    <div className="p-4">
      <VideoDisplay videos={videos ?? []} />
    </div>
  );
};

export default AIPage;
