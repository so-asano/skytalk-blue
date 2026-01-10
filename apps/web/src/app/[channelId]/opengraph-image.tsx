import { ImageResponse } from "next/og";

export const alt = "SkyTalk.Blue Channel";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default async function Image({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  let channelName = channelId;

  try {
    const res = await fetch(`${API_URL}/api/channels/${channelId}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const channel = await res.json();
      channelName = channel.nameEn || channel.nameJa || channelId;
    }
  } catch (e) {
    console.error("OGP fetch error:", e);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              color: "#a1a1aa",
              letterSpacing: "0.05em",
            }}
          >
            SkyTalk.Blue
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "72px",
              fontWeight: "bold",
              color: "#ffffff",
            }}
          >
            #{channelName}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
