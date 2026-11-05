import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,

  images: {
    unoptimized: true,
  },

  // Resolver explícitamente las importaciones @/ desde src.
  webpack(webpackConfig) {
    webpackConfig.resolve ??= {};

    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias ?? {}),
      "@": path.resolve(process.cwd(), "src"),
    };

    return webpackConfig;
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default config;
