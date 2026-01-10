import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const baseUrl = process.env.NEXT_PUBLIC_URL || "https://skytalk.blue";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "SkyTalk.Blue",
  description: "Free conversations on ATProto",
  openGraph: {
    title: "SkyTalk.Blue",
    description: "Free conversations on ATProto",
    siteName: "SkyTalk.Blue",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SkyTalk.Blue - Free conversations on ATProto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SkyTalk.Blue",
    description: "Free conversations on ATProto",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="bg-blur-overlay" />
        <Providers>
          <div className="w-full md:w-3/4 lg:w-3/5 xl:w-3/5 2xl:w-1/2 mx-auto px-6 pt-20 pb-6 min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
