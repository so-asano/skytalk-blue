"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BurgerMenu } from "@/components/burger-menu";
import { useI18n } from "@/lib/i18n";
import { useAuth, authenticatedFetch } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { user, login, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    async function fetchNotificationCount() {
      if (!user?.did) {
        setNotificationCount(0);
        return;
      }

      try {
        const res = await authenticatedFetch(`${API_URL}/api/notifications/${user.did}`, user.did);
        if (res.ok) {
          const data = await res.json();
          const unreadCount = data.filter((n: { markedAsReadAt: string | null }) => !n.markedAsReadAt).length;
          setNotificationCount(unreadCount);
        }
      } catch {
        // Ignore errors
      }
    }

    fetchNotificationCount();

    // Poll every 1 minute
    const interval = setInterval(fetchNotificationCount, 60000);
    return () => clearInterval(interval);
  }, [user?.did]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center py-4 px-6 bg-transparent backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2">
        <svg className="w-7 h-6 text-zinc-900 dark:text-white" viewBox="0 0 40 32" fill="none">
          <path
            d="M32 12c0-4.4-3.6-8-8-8-3.2 0-6 1.9-7.3 4.6C15.8 8.2 14.9 8 14 8c-3.3 0-6 2.7-6 6 0 .4 0 .7.1 1.1C5.2 15.7 3 18.1 3 21c0 3.3 2.7 6 6 6h2l3 5 3-5h15c3.3 0 6-2.7 6-6 0-2.9-2.1-5.4-5-5.9-.1-1-.1-2.1-.1-3.1h-.9z"
            fill="currentColor"
          />
        </svg>
        <span className="text-lg font-bold">SkyTalk.Blue</span>
      </Link>

      <BurgerMenu
        user={user}
        locale={locale}
        theme={theme}
        notificationCount={notificationCount}
        onLocaleChange={setLocale}
        onThemeChange={setTheme}
        onLogin={login}
        onLogout={logout}
        t={t}
      />
    </header>
  );
}
