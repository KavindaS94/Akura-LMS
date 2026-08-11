import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty on purpose — do not externalize @neondatabase/auth (breaks next/headers ESM resolution).
};

export default nextConfig;
