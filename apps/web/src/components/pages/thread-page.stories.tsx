import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThreadPage } from "./thread-page";

const meta = {
  title: "Pages/ThreadPage",
  component: ThreadPage,
  parameters: {
    layout: "padded",
  },
} satisfies Meta<typeof ThreadPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockThread = {
  id: "3lf5abc123def",
  title: "ATProtoについて語ろう",
  text: "ATProtoの技術的な話題について議論しましょう。\n\n## 話題例\n\n- Lexicon設計\n- PDS運用\n- フェデレーション",
  createdAt: "2026-01-09T09:00:00Z",
  authorDid: "did:plc:abc123def456",
  authorHandle: "alice.bsky.social",
};

const mockComments = [
  {
    id: "1",
    authorHandle: "bob.bsky.social",
    text: "いいですね！ATProtoの可能性は無限大だと思います。",
    createdAt: "2026-01-09T10:00:00Z",
    atUri: "at://did:plc:bob123/blue.skytalk.talk.comment/3lf5xyz789",
  },
  {
    id: "2",
    authorHandle: "charlie.bsky.social",
    text: "Lexiconの設計について質問があります。\n\n`record`タイプと`query`タイプの使い分けはどうすればいいですか？",
    createdAt: "2026-01-09T11:00:00Z",
    atUri: "at://did:plc:charlie456/blue.skytalk.talk.comment/3lf5uvw456",
  },
];

const jaTexts = {
  top: "トップ",
  write: "書く",
  preview: "プレビュー",
  contentPlaceholder: "コメントを入力",
  nothingToPreview: "プレビューするものがありません",
  submit: "投稿",
  loginRequired: "ログインしてコメントする",
};

export const Default: Story = {
  args: {
    channelId: "tech",
    channelName: "技術",
    thread: mockThread,
    comments: mockComments,
    isLoggedIn: false,
    locale: "ja",
    texts: jaTexts,
  },
};

export const LoggedIn: Story = {
  args: {
    channelId: "tech",
    channelName: "技術",
    thread: mockThread,
    comments: mockComments,
    isLoggedIn: true,
    locale: "ja",
    texts: jaTexts,
  },
};

export const Posting: Story = {
  args: {
    channelId: "tech",
    channelName: "技術",
    thread: mockThread,
    comments: mockComments,
    isLoggedIn: true,
    posting: true,
    locale: "ja",
    texts: jaTexts,
  },
};

export const NoComments: Story = {
  args: {
    channelId: "tech",
    channelName: "技術",
    thread: mockThread,
    comments: [],
    isLoggedIn: true,
    locale: "ja",
    texts: jaTexts,
  },
};

export const NoThreadText: Story = {
  args: {
    channelId: "general",
    channelName: "雑談",
    thread: {
      ...mockThread,
      title: "今日のランチ何食べた？",
      text: null,
    },
    comments: [],
    isLoggedIn: true,
    locale: "ja",
    texts: jaTexts,
  },
};

export const English: Story = {
  args: {
    channelId: "tech",
    channelName: "Tech",
    thread: mockThread,
    comments: mockComments,
    isLoggedIn: true,
    locale: "en",
    texts: {
      top: "Top",
      write: "Write",
      preview: "Preview",
      contentPlaceholder: "Enter comment",
      nothingToPreview: "Nothing to preview",
      submit: "Post",
      loginRequired: "Login to comment",
    },
  },
};
