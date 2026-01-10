"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <h2 className="text-xl font-semibold mb-2">{t("error.notFound")}</h2>
      <p className="text-muted-foreground mb-6">{t("error.notFoundDescription")}</p>
      <Button asChild>
        <Link href="/">{t("error.backToHome")}</Link>
      </Button>
    </div>
  );
}
