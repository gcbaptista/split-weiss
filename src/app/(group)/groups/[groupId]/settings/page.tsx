import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GroupPasswordSettings } from "@/components/groups/group-password-settings";
import { GroupSettingsForm } from "@/components/groups/group-settings-form";
import { GroupShare } from "@/components/groups/group-share";
import { MemberList } from "@/components/groups/member-list";
import { ResetIdentityButton } from "@/components/groups/reset-identity-button";
import { getAuthorizedGroup, getCurrentMemberId } from "@/lib/group-access";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupSettingsPage({ params }: PageProps) {
  const { groupId } = await params;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const groupUrl = `${proto}://${host}/groups/${groupId}`;

  const [group, currentMemberId, t] = await Promise.all([
    getAuthorizedGroup(groupId),
    getCurrentMemberId(groupId),
    getTranslations("settings"),
  ]);

  if (!group) notFound();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 font-semibold">{t("shareGroup")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("shareGroupDescription")}</p>
        <GroupShare groupName={group.name} groupUrl={groupUrl} hasPassword={!!group.passwordHash} />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">{t("groupDetails")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("groupDetailsDescription")}</p>
        <GroupSettingsForm
          groupId={groupId}
          initialName={group.name}
          initialEmoji={group.emoji}
          initialCurrency={group.currency}
        />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">{t("passwordProtection")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("passwordProtectionDescription")}</p>
        <GroupPasswordSettings groupId={groupId} hasPassword={!!group.passwordHash} />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">{t("members")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("membersDescription")}</p>
        <MemberList />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">{t("yourIdentity")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">{t("yourIdentityDescription")}</p>
        <ResetIdentityButton
          groupId={groupId}
          currentMemberName={group.members.find((m) => m.id === currentMemberId)?.name}
        />
      </section>
    </div>
  );
}
