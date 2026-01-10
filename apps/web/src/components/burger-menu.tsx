"use client";

import { Menu, LogIn, LogOut, Loader2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface User {
  did: string;
  handle: string;
}

interface BurgerMenuProps {
  user: User | null;
  locale: "ja" | "en";
  theme: "light" | "dark" | "system";
  onLocaleChange: (locale: "ja" | "en") => void;
  onThemeChange: (theme: "light" | "dark" | "system") => void;
  onLogin: (handle: string, locale?: "ja" | "en") => Promise<void>;
  onLogout: () => Promise<void>;
  t: (key: string) => string;
}

export function BurgerMenu({
  user,
  locale,
  theme,
  onLocaleChange,
  onThemeChange,
  onLogin,
  onLogout,
  t,
}: BurgerMenuProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginHandle, setLoginHandle] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const isValidHandle = (handle: string): boolean => {
    const trimmed = handle.trim();
    if (trimmed.length === 0) return false;
    // AT Protocol handle format: DNS-like domain (e.g., user.bsky.social)
    const handleRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return handleRegex.test(trimmed);
  };

  const isHandleValid = isValidHandle(loginHandle);

  const handleLogin = async () => {
    if (!isValidHandle(loginHandle)) return;
    const handle = loginHandle.trim();

    setLoginLoading(true);
    try {
      await onLogin(handle, locale);
    } catch {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await onLogout();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 text-xs">
          <DropdownMenuRadioGroup value={locale} onValueChange={(value) => onLocaleChange(value as "ja" | "en")}>
            <DropdownMenuRadioItem value="ja" onSelect={(e) => e.preventDefault()}>日本語</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="en" onSelect={(e) => e.preventDefault()}>English</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={theme} onValueChange={(value) => onThemeChange(value as "light" | "dark" | "system")}>
            <DropdownMenuRadioItem value="light" onSelect={(e) => e.preventDefault()}>{t("theme.light")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" onSelect={(e) => e.preventDefault()}>{t("theme.dark")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system" onSelect={(e) => e.preventDefault()}>{t("theme.system")}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          {user ? (
            <>
              <DropdownMenuLabel className="font-normal text-muted-foreground">
                <a
                  href={`https://bsky.app/profile/${user.did}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  @{user.handle}
                </a>
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
                {t("common.logout")}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={() => setShowLoginModal(true)}>
              <LogIn className="w-4 h-4" />
              {t("common.login")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showLoginModal} onOpenChange={(open) => {
        setShowLoginModal(open);
        if (!open) {
          setLoginHandle("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.loginTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex">
              <Input
                value={loginHandle}
                onChange={(e) => setLoginHandle(e.target.value)}
                placeholder={t("auth.handlePlaceholder")}
                onKeyDown={(e) => e.key === "Enter" && !loginLoading && isHandleValid && handleLogin()}
                disabled={loginLoading}
                className="flex-1 rounded-r-none border-r-0"
              />
              <Button type="button" onClick={handleLogin} disabled={!isHandleValid || loginLoading} className="rounded-l-none">
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.login")}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.noAccount")}
              <a
                href="https://bsky.app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground ml-1"
              >
                {t("auth.createAccount")}
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
