import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.repl.co", "*.replit.dev", "*.spock.replit.dev"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
