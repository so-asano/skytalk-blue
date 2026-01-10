import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Card, CardContent } from './card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardContent className="py-4">
        <p>Card content goes here</p>
      </CardContent>
    </Card>
  ),
};

export const ThreadCard: Story = {
  render: () => (
    <Card className="w-[600px] cursor-pointer hover:bg-accent transition-colors">
      <CardContent className="py-4">
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">
            #技術
          </span>
          <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
            42 comments
          </span>
        </div>
        <p className="font-medium mb-1">Next.js 15の新機能について語ろう</p>
        <p className="text-sm text-muted-foreground truncate">
          Server Actionsがさらに使いやすくなったし、PPRも正式リリースされたね。みんなはどの機能が気になる？
        </p>
      </CardContent>
    </Card>
  ),
};

export const ResponseCard: Story = {
  render: () => (
    <Card className="w-[600px]">
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-2 mb-2 text-sm">
          <span className="font-medium">名無しさん@dev.bsky.social</span>
          <span className="text-muted-foreground">2026/01/08(水) 10:00:00</span>
        </div>
        <div className="pl-3 border-l-2 border-border">
          <p>Server Actionsがさらに使いやすくなったし、PPRも正式リリースされたね。</p>
        </div>
        <div className="mt-2 text-xs text-muted-foreground/50 font-mono truncate">
          at://did:plc:abc123/app.skychannel.post/3abc001
        </div>
      </CardContent>
    </Card>
  ),
};
