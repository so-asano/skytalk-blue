"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h1 className="text-4xl font-bold mb-4">500</h1>
      <h2 className="text-xl font-semibold mb-2">{t("error.error")}</h2>
      <p className="text-muted-foreground mb-6">{t("error.errorDescription")}</p>
      <Button onClick={() => reset()}>{t("error.tryAgain")}</Button>
    </div>
  );
}
