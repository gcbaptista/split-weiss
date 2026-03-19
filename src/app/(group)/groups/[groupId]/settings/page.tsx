import { getAuthorizedGroup } from "@/lib/group-access";
import { notFound } from "next/navigation";
import { MemberList } from "@/components/groups/member-list";
import { GroupSettingsForm } from "@/components/groups/group-settings-form";
import { GroupPasswordSettings } from "@/components/groups/group-password-settings";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupSettingsPage({ params }: PageProps) {
  const { groupId } = await params;
  const group = await getAuthorizedGroup(groupId);

  if (!group) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 font-semibold">Group details</h2>
        <p className="mb-4 text-sm text-muted-foreground">Anyone in the group can edit these.</p>
        <GroupSettingsForm
          groupId={groupId}
          initialName={group.name}
          initialEmoji={group.emoji}
        />
      </div>

      <div>
        <h2 className="mb-1 font-semibold">Password protection</h2>
        <p className="mb-4 text-sm text-muted-foreground">Ask for a password on new devices.</p>
        <GroupPasswordSettings
          groupId={groupId}
          hasPassword={!!group.passwordHash}
        />
      </div>

      <div>
        <h2 className="mb-4 font-semibold">Members</h2>
        <p className="mb-4 text-sm text-muted-foreground">Anyone in the group can add or remove people.</p>
        <MemberList
          members={group.members}
          groupId={groupId}
        />
      </div>
    </div>
  );
}