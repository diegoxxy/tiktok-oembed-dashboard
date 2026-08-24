import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Abaikan error TypeScript saat proses build di Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // Abaikan error ESLint saat proses build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;