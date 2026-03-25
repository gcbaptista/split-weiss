"use client";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GroupError({ error, reset }: ErrorProps) {
  const t = useTranslations("error");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-2xl">⚠️</p>
      <h2 className="text-lg font-semibold">{t("somethingWentWrong")}</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        {error.message || t("unexpectedError")}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}
