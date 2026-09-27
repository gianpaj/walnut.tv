/** @satisfies {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    useTypeScriptCli: true,
  },
  async redirects() {
    return [
      { source: "/", destination: "/hustle", permanent: false },
      ...["reddit", "curious", "docus"].map((category) => ({
        source: `/${category}/:videoId?`,
        destination: "/",
        permanent: true,
      })),
    ];
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
