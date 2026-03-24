import { headers } from "next/headers";
import { notFound } from "next/navigation";

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

  const [group, currentMemberId] = await Promise.all([
    getAuthorizedGroup(groupId),
    getCurrentMemberId(groupId),
  ]);

  if (!group) notFound();

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 font-semibold">Share group</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Invite others by sharing the link or scanning the QR code.
        </p>
        <GroupShare
          groupId={groupId}
          groupName={group.name}
          groupUrl={groupUrl}
          hasPassword={!!group.passwordHash}
        />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Group details</h2>
        <p className="mb-3 text-sm text-muted-foreground">Anyone in the group can edit these.</p>
        <GroupSettingsForm
          groupId={groupId}
          initialName={group.name}
          initialEmoji={group.emoji}
          initialCurrency={group.currency}
        />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Password protection</h2>
        <p className="mb-3 text-sm text-muted-foreground">Ask for a password on new devices.</p>
        <GroupPasswordSettings groupId={groupId} hasPassword={!!group.passwordHash} />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Members</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Anyone in the group can add or remove people.
        </p>
        <MemberList
          members={group.members}
          groupId={groupId}
          currentMemberId={currentMemberId ?? undefined}
        />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Your identity</h2>
        <p className="mb-3 text-sm text-muted-foreground">Change who you are on this device.</p>
        <ResetIdentityButton
          groupId={groupId}
          currentMemberName={group.members.find((m) => m.id === currentMemberId)?.name}
        />
      </section>
    </div>
  );
}
