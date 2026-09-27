/** @satisfies {import('next').NextConfig} */
const nextConfig = {
  // The legacy SPA shim needs the raw query, before Next decodes and reserializes it.
  skipProxyUrlNormalize: true,
  experimental: {
    useTypeScriptCli: true,
  },
  async redirects() {
    return ["reddit", "curious", "docus"].map((category) => ({
      source: `/${category}/:videoId?`,
      destination: "/",
      permanent: true,
    }));
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
