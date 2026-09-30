import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HokejHub",
    short_name: "HokejHub",
    description: "Živé výsledky, kurzy a analytika – české ligy a NHL.",
    lang: "cs",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1116",
    theme_color: "#0b1116",
    icons: [
      { src: "/icons/icon-192-v2.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512-v2.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512-v2.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
