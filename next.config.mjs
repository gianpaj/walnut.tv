/** @satisfies {import('next').NextConfig} */
const nextConfig = {
  // Avoid Next's URL normalization for ordinary homepage redirects.
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
