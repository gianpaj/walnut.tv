import { Loader2 } from "lucide-react";

const LoadingPage = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-y-4">
      {/* <h1 className="text-4xl text-center text-primary">Loading</h1> */}
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
};

export default LoadingPage;
