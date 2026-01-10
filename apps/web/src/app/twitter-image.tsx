import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "SkyTalk.Blue - Free conversations on ATProto";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 32 }}>
          <svg width="80" height="64" viewBox="0 0 40 32" fill="none">
            <path
              d="M32 12c0-4.4-3.6-8-8-8-3.2 0-6 1.9-7.3 4.6C15.8 8.2 14.9 8 14 8c-3.3 0-6 2.7-6 6 0 .4 0 .7.1 1.1C5.2 15.7 3 18.1 3 21c0 3.3 2.7 6 6 6h2l3 5 3-5h15c3.3 0 6-2.7 6-6 0-2.9-2.1-5.4-5-5.9-.1-1-.1-2.1-.1-3.1h-.9z"
              fill="white"
            />
          </svg>
          <span style={{ fontSize: 72, fontWeight: 700 }}>SkyTalk.Blue</span>
        </div>
        <div style={{ fontSize: 32, color: "#a1a1aa" }}>
          Free conversations on ATProto
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
