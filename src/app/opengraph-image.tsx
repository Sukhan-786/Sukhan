import { ImageResponse } from "next/og";
export const alt = "Sukhan — A home for words and voices";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#f4f0e7",
        color: "#243c35",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 90,
      }}
    >
      <div style={{ fontSize: 26, letterSpacing: 10 }}>SUKHAN</div>
      <div style={{ fontSize: 82, marginTop: 40 }}>
        Some words stay with you.
      </div>
      <div style={{ fontSize: 34, marginTop: 28, color: "#87533a" }}>
        Literature · Poetry · Voices
      </div>
    </div>,
    size,
  );
}
