"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth, resetOAuthClient } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function OAuthCallback() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL params (e.g., user denied authorization)
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    const errorDesc = params.get("error_description");

    if (errorParam) {
      setStatus("error");
      setError(errorDesc || errorParam);
      // Reset OAuth client to allow fresh login attempts
      resetOAuthClient().catch(console.error);
      return;
    }

    // If no hash or search params, something went wrong
    if (!window.location.hash && !window.location.search) {
      setStatus("error");
      setError(t("auth.authFailed"));
      resetOAuthClient().catch(console.error);
    }
  }, [t]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    if (status === "error") return;

    if (user) {
      setStatus("success");
      setTimeout(() => {
        router.replace("/");
      }, 1000);
    } else if (!loading) {
      // Auth finished but no user - might be an error
      const params = new URLSearchParams(window.location.search);
      if (!params.get("error")) {
        // Give it a moment, then check again
        const timer = setTimeout(() => {
          if (!user) {
            setStatus("error");
            setError(t("auth.authFailed"));
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user, loading, status, router, t]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card p-8 rounded-xl shadow-sm border max-w-md w-full mx-4">
        {status === "loading" && (
          <div className="flex items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold mb-1">{t("auth.callbackProcessing")}</h2>
              <p className="text-sm text-muted-foreground">{t("auth.callbackProcessingDesc")}</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold mb-1">{t("auth.callbackSuccess")}</h2>
            <p className="text-sm text-muted-foreground">{t("auth.callbackRedirecting")}</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold mb-1">{t("auth.callbackError")}</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/")}>
              {t("auth.backToHome")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
