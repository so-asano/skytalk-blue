import { ImageResponse } from "next/og";

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
          <svg width="80" height="80" viewBox="0 0 32 32" fill="none">
            <g transform="translate(0, 1)">
              <path
                d="M22.4,11.2C22.4,8.56 20.24,6.4 17.6,6.4C15.68,6.4 14,7.52 13.2,9.2C12.72,8.96 12.16,8.8 11.6,8.8C9.6,8.8 8,10.4 8,12.4C8,12.64 8,12.8 8.08,13.04C6.4,13.44 5.2,14.88 5.2,16.6C5.2,18.6 6.8,20.2 8.8,20.2L10,20.2L11.8,23.2L13.6,20.2L22.8,20.2C24.8,20.2 26.4,18.6 26.4,16.6C26.4,14.84 25.12,13.4 23.4,13.08C23.32,12.44 22.4,11.2 22.4,11.2Z"
                fill="white"
              />
            </g>
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
