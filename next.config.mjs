/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  logging: {
    incomingRequests: {
      ignore: [/^\/metrics(?:\/)?(?:\?.*)?$/]
    }
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" }
        ]
      }
    ];
  },
  // Vercel-д pg native module-г exclude хийх
  serverExternalPackages: ["pg-native"],
};

export default nextConfig;
