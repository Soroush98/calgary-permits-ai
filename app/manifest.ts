import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YYC Permits — Calgary Building Permits Search",
    short_name: "YYC Permits",
    description:
      "Natural-language search across every City of Calgary building permit.",
    start_url: "/",
    display: "standalone",
    background_color: "#050507",
    theme_color: "#050507",
    lang: "en-CA",
    categories: ["productivity", "utilities", "business"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
  };
}
