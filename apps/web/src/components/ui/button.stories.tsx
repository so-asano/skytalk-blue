import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './button';
import { ArrowLeft, Plus, Menu } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Link',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'ghost',
    size: 'sm',
    children: (
      <>
        <ArrowLeft className="w-4 h-4 mr-1" />
        戻る
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: {
    variant: 'ghost',
    size: 'icon',
    children: <Menu className="w-5 h-5" />,
  },
};

export const NewThread: Story = {
  args: {
    children: (
      <>
        <Plus className="w-4 h-4" />
        新規スレッド作成
      </>
    ),
  },
};
