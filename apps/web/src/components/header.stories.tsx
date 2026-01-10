import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { Menu, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderStoryProps {
  locale: "ja" | "en";
  theme: "light" | "dark" | "system";
  user: { handle: string } | null;
}

function HeaderStory({ locale, theme, user }: HeaderStoryProps) {
  const texts = {
    ja: {
      light: "ライト",
      dark: "ダーク",
      system: "システム",
      login: "ログイン",
      logout: "ログアウト",
    },
    en: {
      light: "Light",
      dark: "Dark",
      system: "System",
      login: "Login",
      logout: "Logout",
    },
  };

  const t = texts[locale];

  return (
    <header className="flex justify-between items-center py-4 px-6 bg-background">
      <Link href="/" className="flex items-center gap-2">
        <svg className="w-7 h-6" viewBox="0 0 40 32" fill="none">
          <path
            d="M32 12c0-4.4-3.6-8-8-8-3.2 0-6 1.9-7.3 4.6C15.8 8.2 14.9 8 14 8c-3.3 0-6 2.7-6 6 0 .4 0 .7.1 1.1C5.2 15.7 3 18.1 3 21c0 3.3 2.7 6 6 6h2l3 5 3-5h15c3.3 0 6-2.7 6-6 0-2.9-2.1-5.4-5-5.9-.1-1-.1-2.1-.1-3.1h-.9z"
            fill="currentColor"
          />
        </svg>
        <span className="text-lg font-bold">SkyTalk.Blue</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 text-xs">
          <DropdownMenuRadioGroup value={locale}>
            <DropdownMenuRadioItem value="ja" onSelect={(e) => e.preventDefault()}>日本語</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="en" onSelect={(e) => e.preventDefault()}>English</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={theme}>
            <DropdownMenuRadioItem value="light" onSelect={(e) => e.preventDefault()}>{t.light}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" onSelect={(e) => e.preventDefault()}>{t.dark}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system" onSelect={(e) => e.preventDefault()}>{t.system}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          {user ? (
            <>
              <DropdownMenuLabel className="font-normal text-muted-foreground">
                @{user.handle}
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <LogOut className="w-4 h-4" />
                {t.logout}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem>
              <LogIn className="w-4 h-4" />
              {t.login}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

const meta = {
  title: "Components/Header",
  component: HeaderStory,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof HeaderStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {
  args: {
    locale: "ja",
    theme: "light",
    user: null,
  },
};

export const LoggedIn: Story = {
  args: {
    locale: "ja",
    theme: "light",
    user: { handle: "alice.bsky.social" },
  },
};

export const English: Story = {
  args: {
    locale: "en",
    theme: "light",
    user: null,
  },
};

export const DarkTheme: Story = {
  args: {
    locale: "ja",
    theme: "dark",
    user: { handle: "bob.bsky.social" },
  },
};
