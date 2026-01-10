import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton } from './skeleton';
import { Card, CardContent } from './card';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'h-4 w-[200px]',
  },
};

export const ChannelTags: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
  ),
};

export const ThreadCard: Story = {
  render: () => (
    <Card className="w-[600px]">
      <CardContent className="py-4">
        <div className="flex justify-between items-start mb-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-64 mb-1" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  ),
};

export const ResponseCard: Story = {
  render: () => (
    <Card className="w-[600px]">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-8 rounded" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="pl-3 border-l-2 border-border">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  ),
};
