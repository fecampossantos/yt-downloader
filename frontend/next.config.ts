import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static"], // Ensure ffmpeg isn't bundled by Next.js if ever imported
  experimental: {
    serverActions: {
      allowedOrigins: ["*.loca.lt", "localhost:3000"],
    },
  },
  // Allows Next.js development server to accept requests from Localtunnel without throwing "Cross origin request detected"
  allowedDevOrigins: ["*.loca.lt", "localhost:3000"],
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://127.0.0.1:3001/:path*", // Proxy to Backend
      },
    ];
  },
};

export default nextConfig;
