import { getGroup } from "@/app/actions/group.actions";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MemberList } from "@/components/groups/member-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupSettingsPage({ params }: PageProps) {
  const { groupId } = await params;
  const session = await auth();
  const group = await getGroup(groupId);
  if (!group || !session?.user?.id) notFound();
  const currentMember = group.members.find(
    (m) => m.userId === session.user!.id
  );
  const isAdmin = currentMember?.role === "ADMIN";

  return (
    <div className="max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberList
            members={group.members}
            groupId={groupId}
            currentUserId={session.user.id}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
