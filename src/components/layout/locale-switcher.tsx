"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useTransition } from "react";

import { setLocale } from "@/app/actions/locale.actions";
import { type Locale, localeNames, locales } from "@/i18n/config";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export function LocaleSwitcher() {
  const currentLocale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(locale: string | null) {
    if (!locale || locale === currentLocale) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <Select value={currentLocale} onValueChange={handleSelect} disabled={isPending}>
      <SelectTrigger
        size="sm"
        className="w-auto min-w-0 border-none shadow-none text-xs text-muted-foreground hover:text-foreground bg-transparent"
      >
        <SelectValue>{localeNames[currentLocale as Locale]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
