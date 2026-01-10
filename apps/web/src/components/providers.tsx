"use client";

import { ReactNode, useEffect } from "react";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          {children}
          <Toaster position="bottom-center" richColors theme="system" toastOptions={{ style: { zIndex: 9999 } }} />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
