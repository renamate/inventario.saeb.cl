import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite probar el servidor de desarrollo desde 127.0.0.1 o desde un teléfono en la misma red.
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.*.*", "10.*.*.*"],
  devIndicators: false,
};

export default nextConfig;
