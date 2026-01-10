import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChannelPage } from "./channel-page";

const meta = {
  title: "Pages/ChannelPage",
  component: ChannelPage,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ChannelPage>;

export default meta;
type Story = StoryObj<typeof meta>;

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
    channelId: "general",
    title: "今日のランチ何食べた？",
    text: null,
    authorHandle: "bob.bsky.social",
    createdAt: "2026-01-08T12:00:00Z",
    commentCount: 3,
  },
];

const jaTexts = {
  top: "トップ",
  newThread: "新規スレッド",
  titlePlaceholder: "タイトルを入力",
  write: "書く",
  preview: "プレビュー",
  contentPlaceholder: "本文を入力（任意）",
  nothingToPreview: "プレビューするものがありません",
  create: "作成",
  cancel: "キャンセル",
  noThreads: "スレッドがありません",
};

export const Default: Story = {
  args: {
    channelName: "雑談",
    threads: mockThreads,
    isLoggedIn: false,
    texts: jaTexts,
  },
};

export const LoggedIn: Story = {
  args: {
    channelName: "雑談",
    threads: mockThreads,
    isLoggedIn: true,
    texts: jaTexts,
  },
};

export const Empty: Story = {
  args: {
    channelName: "雑談",
    threads: [],
    isLoggedIn: true,
    texts: jaTexts,
  },
};

export const English: Story = {
  args: {
    channelName: "General",
    threads: mockThreads,
    isLoggedIn: true,
    texts: {
      top: "Top",
      newThread: "New Thread",
      titlePlaceholder: "Enter title",
      write: "Write",
      preview: "Preview",
      contentPlaceholder: "Enter content (optional)",
      nothingToPreview: "Nothing to preview",
      create: "Create",
      cancel: "Cancel",
      noThreads: "No threads",
    },
  },
};
