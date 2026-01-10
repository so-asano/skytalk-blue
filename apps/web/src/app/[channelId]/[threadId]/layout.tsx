import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

interface Thread {
  id: string;
  channelId: string;
  title: string;
  text: string | null;
  authorDid: string;
}

async function getThread(
  threadId: string
): Promise<Thread | null> {
  try {
    const res = await fetch(`${API_URL}/api/threads/${threadId}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      return data.thread;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelId: string; threadId: string }>;
}): Promise<Metadata> {
  const { channelId, threadId } = await params;
  const thread = await getThread(threadId);

  const title = thread
    ? `${thread.title} - SkyTalk.Blue`
    : "SkyTalk.Blue";
  const description = thread
    ? thread.text?.slice(0, 200) || `Thread by ${thread.authorDid}`
    : "SkyTalk.Blue";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${channelId}/${threadId}`,
      siteName: "SkyTalk.Blue",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function ThreadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
