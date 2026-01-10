import { ImageResponse } from "next/og";

export const alt = "SkyTalk.Blue Thread";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default async function Image({
  params,
}: {
  params: Promise<{ channelId: string; threadId: string }>;
}) {
  const { channelId, threadId } = await params;

  let title = "Thread";
  let channelName = channelId;

  try {
    const [threadRes, channelRes] = await Promise.all([
      fetch(`${API_URL}/api/threads/${threadId}`, { next: { revalidate: 60 } }),
      fetch(`${API_URL}/api/channels/${channelId}`, { next: { revalidate: 60 } }),
    ]);

    if (threadRes.ok) {
      const data = await threadRes.json();
      title = data.thread?.title || "Thread";
    }

    if (channelRes.ok) {
      const channel = await channelRes.json();
      channelName = channel.nameEn || channel.nameJa || channelId;
    }
  } catch (e) {
    console.error("OGP fetch error:", e);
  }

  // Truncate title if too long
  const displayTitle = title.length > 40 ? title.substring(0, 40) + "..." : title;

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
          padding: "48px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              color: "#a1a1aa",
              letterSpacing: "0.05em",
            }}
          >
            SkyTalk.Blue
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "#71717a",
            }}
          >
            #{channelName}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "56px",
              fontWeight: "bold",
              color: "#ffffff",
              lineHeight: 1.3,
              maxWidth: "1000px",
            }}
          >
            {displayTitle}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
