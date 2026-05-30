import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['@prisma/client', 'prisma'],
  allowedDevOrigins: ['192.168.1.13'],
};

export default nextConfig;
