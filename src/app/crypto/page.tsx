import VideoDisplay from "@/components/VideoDisplay";
import { fetchYouTubeVideos } from "@/lib/actions/youtube";

const CryptoPage = async () => {
  const videos = await fetchYouTubeVideos({ title: "crypto" });

  return (
    <div className="p-4">
      <VideoDisplay videos={videos ?? []} />
    </div>
  );
};

export default CryptoPage;
