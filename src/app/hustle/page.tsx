import VideoDisplay from "@/components/VideoDisplay";
import { fetchYouTubeVideos } from "@/lib/actions/youtube";

const HustlePage = async () => {
  const videos = await fetchYouTubeVideos({ title: "hustle" });

  return (
    <div className="p-4">
      <VideoDisplay videos={videos ?? []} />
    </div>
  );
};

export default HustlePage;
