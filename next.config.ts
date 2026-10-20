import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The home folder has its own lockfile; pin the workspace root to this project.
  turbopack: { root: __dirname },
};

export default nextConfig;
