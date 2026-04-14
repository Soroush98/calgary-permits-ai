import { ImageResponse } from "next/og";

export const alt = "YYC Permits — natural-language search for Calgary building permits";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "radial-gradient(1200px 600px at 0% 0%, #1e3a8a 0%, transparent 60%), radial-gradient(1000px 500px at 100% 100%, #6b21a8 0%, transparent 60%), #050507",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <div style={{ width: 28, height: 120, background: "linear-gradient(180deg,#60a5fa,#a855f7)", borderRadius: 6 }} />
            <div style={{ width: 28, height: 90, background: "linear-gradient(180deg,#60a5fa,#a855f7)", borderRadius: 6, opacity: 0.75 }} />
            <div style={{ width: 28, height: 60, background: "linear-gradient(180deg,#60a5fa,#a855f7)", borderRadius: 6, opacity: 0.5 }} />
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, letterSpacing: -1.5, display: "flex", gap: 12 }}>
            <span style={{ color: "#60a5fa" }}>YYC</span>
            <span style={{ color: "#d4d4d8", fontWeight: 500 }}>Permits</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05, display: "flex", flexDirection: "column" }}>
            <span>Ask anything.</span>
            <span style={{ color: "#a1a1aa" }}>See everything built.</span>
          </div>
          <div style={{ fontSize: 32, color: "#a1a1aa", maxWidth: 900, lineHeight: 1.3 }}>
            Natural-language search across 488,000 Calgary building permits.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, color: "#71717a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 10, background: "#10b981" }} />
            <span>Live · 488K permits indexed</span>
          </div>
          <div>yycpermits.com</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
