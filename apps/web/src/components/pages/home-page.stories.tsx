import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomePage } from "./home-page";

const meta = {
  title: "Pages/HomePage",
  component: HomePage,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof HomePage>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockChannels = [
  { id: "general", nameJa: "雑談", nameEn: "General" },
  { id: "tech", nameJa: "技術", nameEn: "Tech" },
  { id: "random", nameJa: "なんでも", nameEn: "Random" },
];

const mockThreads = [
  {
    id: "1",
    channelId: "general",
    title: "はじめまして！自己紹介スレッド",
    text: "みなさんはじめまして。自己紹介をお願いします。",
    authorHandle: "alice.bsky.social",
    createdAt: "2026-01-09T10:00:00Z",
    commentCount: 5,
  },
  {
    id: "2",
    channelId: "tech",
    title: "ATProtoについて語ろう",
    text: "ATProtoの技術的な話題について議論しましょう。",
    authorHandle: "bob.bsky.social",
    createdAt: "2026-01-09T09:00:00Z",
    commentCount: 12,
  },
  {
    id: "3",
    channelId: "general",
    title: "今日のランチ何食べた？",
    text: null,
    authorHandle: "charlie.bsky.social",
    createdAt: "2026-01-08T12:00:00Z",
    commentCount: 3,
  },
];

export const Default: Story = {
  args: {
    channels: mockChannels,
    threads: mockThreads,
    locale: "ja",
    noRecentText: "最近のスレッドはありません",
    seeMoreText: "もっと見る",
  },
};

export const English: Story = {
  args: {
    channels: mockChannels,
    threads: mockThreads,
    locale: "en",
    noRecentText: "No recent threads",
    seeMoreText: "See more",
  },
};

export const Empty: Story = {
  args: {
    channels: mockChannels,
    threads: [],
    locale: "ja",
    noRecentText: "最近のスレッドはありません",
    seeMoreText: "もっと見る",
  },
};

export const NoChannels: Story = {
  args: {
    channels: [],
    threads: [],
    locale: "ja",
    noRecentText: "最近のスレッドはありません",
    seeMoreText: "もっと見る",
  },
};
