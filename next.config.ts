import type { NextConfig } from "next";

// This is validation for the environment variables early in the build process.
import "./lib/env";

const isDocker = process.env.IS_DOCKER === "true";

const config: NextConfig = {
  distDir: process.env.LIPI_BUILD_DIR || ".next",
  reactStrictMode: true,
  devIndicators: false,
  images: {
    remotePatterns: [],
    unoptimized: !isDocker,
  },

  output: isDocker ? "standalone" : undefined /* ... */,
};

export default config;
