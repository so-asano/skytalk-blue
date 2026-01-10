import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

interface Channel {
  id: string;
  nameJa: string;
  nameEn: string;
}

async function getChannel(channelId: string): Promise<Channel | null> {
  try {
    const res = await fetch(`${API_URL}/api/channels/${channelId}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      return res.json();
    }
  } catch {
    // ignore
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelId: string }>;
}): Promise<Metadata> {
  const { channelId } = await params;
  const channel = await getChannel(channelId);

  const title = channel
    ? `#${channel.nameJa} - SkyTalk.Blue`
    : `#${channelId} - SkyTalk.Blue`;
  const description = channel
    ? `Threads in #${channel.nameEn || channel.nameJa}`
    : `Threads in #${channelId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${channelId}`,
      siteName: "SkyTalk.Blue",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ChannelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
