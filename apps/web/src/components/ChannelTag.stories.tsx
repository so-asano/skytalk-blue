import type { Meta, StoryObj } from '@storybook/nextjs-vite';

const ChannelTag = ({ name, count, color }: { name: string; count: number; color: string }) => (
  <a
    href="#"
    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${color}`}
  >
    #{name} ({count})
  </a>
);

const meta: Meta<typeof ChannelTag> = {
  title: 'Components/ChannelTag',
  component: ChannelTag,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: '技術',
    count: 8,
    color: 'bg-blue-50 text-blue-500 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
  },
};

export const AllChannels: Story = {
  render: () => {
    const channels = [
      { name: '一般', count: 12, color: 'bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800' },
      { name: '技術', count: 8, color: 'bg-blue-50 text-blue-500 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50' },
      { name: 'ゲーム', count: 15, color: 'bg-purple-50 text-purple-500 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50' },
      { name: 'アニメ', count: 22, color: 'bg-pink-50 text-pink-500 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400 dark:hover:bg-pink-900/50' },
      { name: 'AI', count: 18, color: 'bg-cyan-50 text-cyan-500 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50' },
      { name: 'Bluesky', count: 11, color: 'bg-sky-50 text-sky-500 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50' },
    ];
    return (
      <div className="flex flex-wrap gap-2">
        {channels.map((channel) => (
          <ChannelTag key={channel.name} {...channel} />
        ))}
      </div>
    );
  },
};
