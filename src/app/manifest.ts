import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inventario SAEB · Bodega CDP",
    short_name: "Inventario SAEB",
    description: "Registro de movimientos y compras de la bodega CDP.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7faf9",
    theme_color: "#1f6f5f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
