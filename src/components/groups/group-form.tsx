"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createGroup } from "@/app/actions/group.actions";
import { CurrencySelect } from "@/components/shared/currency-select";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DEFAULT_CURRENCY } from "@/lib/currency/constants";
import { type CreateGroupInput, createGroupSchema } from "@/lib/validations/group.schema";

export function GroupForm() {
  const t = useTranslations("groupForm");
  const router = useRouter();
  const form = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      creatorName: "",
      name: "",
      currency: DEFAULT_CURRENCY,
      emoji: "",
      password: "",
    },
  });

  async function onSubmit(data: CreateGroupInput) {
    const result = await createGroup(data);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(t("groupCreated"));
    router.push(`/groups/${result.data!.id}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="creatorName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("yourName")}</FormLabel>
              <FormControl>
                <Input placeholder={t("yourNamePlaceholder")} autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("groupName")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("groupNamePlaceholder")}
                  autoComplete="organization"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emoji"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("emoji")}</FormLabel>
              <FormControl>
                <Input placeholder={t("emojiPlaceholder")} maxLength={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("defaultCurrency")}</FormLabel>
              <FormControl>
                <CurrencySelect value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("password")}</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? t("creating") : t("createGroup")}
        </Button>
      </form>
    </Form>
  );
}
