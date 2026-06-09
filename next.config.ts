import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Electron
  output: "export",

  // Ensure assets load correctly from filesystem
  basePath: "",
  assetPrefix: "",

  // Disable image optimization (static export requirement)
  images: {
    unoptimized: true,
  },

  // Silence Turbopack root warning (monorepo context)
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
