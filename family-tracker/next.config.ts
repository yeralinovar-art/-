import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Фото тарелки для AI-оценки (сжатое на телефоне до ~1024 px).
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
