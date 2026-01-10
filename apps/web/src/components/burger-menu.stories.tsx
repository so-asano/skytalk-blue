import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { BurgerMenu } from "./burger-menu";

const mockT = (key: string) => {
  const messages: Record<string, string> = {
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",
    "common.login": "Login",
    "common.logout": "Logout",
    "common.cancel": "Cancel",
    "auth.loginTitle": "Login",
    "auth.handlePlaceholder": "handle.bsky.social",
    "auth.noAccount": "Don't have an account?",
    "auth.createAccount": "Create one",
  };
  return messages[key] || key;
};

const meta = {
  title: "Components/BurgerMenu",
  component: BurgerMenu,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    locale: "en",
    theme: "system",
    onLocaleChange: fn(),
    onThemeChange: fn(),
    onLogin: fn(),
    onLogout: fn(),
    t: mockT,
  },
} satisfies Meta<typeof BurgerMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {
  args: {
    user: null,
  },
};

export const LoggedIn: Story = {
  args: {
    user: {
      did: "did:plc:abc123",
      handle: "alice.bsky.social",
    },
  },
};

export const Japanese: Story = {
  args: {
    user: null,
    locale: "ja",
    t: (key: string) => {
      const messages: Record<string, string> = {
        "theme.light": "ライト",
        "theme.dark": "ダーク",
        "theme.system": "システム",
        "common.login": "ログイン",
        "common.logout": "ログアウト",
        "common.cancel": "キャンセル",
        "auth.loginTitle": "ログイン",
        "auth.handlePlaceholder": "handle.bsky.social",
        "auth.noAccount": "アカウントがない場合は",
        "auth.createAccount": "作成する",
      };
      return messages[key] || key;
    },
  },
};

export const DarkTheme: Story = {
  args: {
    user: null,
    theme: "dark",
  },
  parameters: {
    backgrounds: { default: "dark" },
  },
};
