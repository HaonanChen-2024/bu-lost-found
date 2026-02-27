import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Keep CI/CD deploys unblocked by legacy lint debt.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
