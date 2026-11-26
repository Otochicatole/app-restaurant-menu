import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1"],
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  redirects() {
    return [
      { source: "/sala/:path*", destination: "/floor/:path*", permanent: true },
      { source: "/admin/restaurantes/:restaurantId/salones", destination: "/admin/restaurants/:restaurantId/rooms", permanent: true },
      { source: "/admin/restaurantes/:restaurantId/reservas", destination: "/admin/restaurants/:restaurantId/reservations", permanent: true },
      { source: "/admin/restaurantes/:path*", destination: "/admin/restaurants/:path*", permanent: true },
      { source: "/admin/reservas", destination: "/admin/reservations", permanent: true },
      { source: "/superadmin/clientes/:id/restaurantes/:path*", destination: "/superadmin/clients/:id/restaurants/:path*", permanent: true },
      { source: "/superadmin/clientes/:path*", destination: "/superadmin/clients/:path*", permanent: true },
      { source: "/superadmin/plantillas/:path*", destination: "/superadmin/templates/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
