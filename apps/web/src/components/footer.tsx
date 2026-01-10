"use client";

import { CircleHelp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="mt-auto pt-12 pb-6 text-center text-sm text-muted-foreground flex items-center justify-center flex-wrap gap-y-1">
      <a href="/about" className="hover:text-foreground transition-colors">
        <CircleHelp className="w-4 h-4" />
      </a>
      <span className="mx-2">•</span>
      <a href="/terms" className="hover:underline">
        {t("footer.terms")}
      </a>
      <span className="mx-2">•</span>
      <a href="/privacy" className="hover:underline">
        {t("footer.privacy")}
      </a>
      <span className="mx-2">•</span>
      &copy; 2026 <a href="https://www.bluecast.app" target="_blank" rel="noopener noreferrer" className="hover:underline">Bluecast Team</a>
    </footer>
  );
}
