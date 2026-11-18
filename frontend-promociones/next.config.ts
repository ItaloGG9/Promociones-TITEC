
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enviar las peticiones de promociones al API Gateway
  async rewrites() {
    const gateway = process.env.API_GATEWAY_URL;

    if (!gateway) {
      return [];
    }

    return [
      {
        source: "/api/promociones/:path*",
        destination: `${gateway}/api/promociones/:path*`,
      },
    ];
  },
};

export default nextConfig;
