import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 10,
          padding: 28,
          background: "#050507",
          borderRadius: 40,
        }}
      >
        <div style={{ width: 28, height: 112, background: "linear-gradient(180deg,#60a5fa,#a855f7)", borderRadius: 6 }} />
        <div style={{ width: 28, height: 84, background: "linear-gradient(180deg,#60a5fa,#a855f7)", borderRadius: 6, opacity: 0.75 }} />
        <div style={{ width: 28, height: 60, background: "linear-gradient(180deg,#60a5fa,#a855f7)", borderRadius: 6, opacity: 0.5 }} />
      </div>
    ),
    { ...size },
  );
}
