import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    emoji?: string | null;
    currency: string;
    _count?: { expenses: number };
    members: { user: { name?: string | null } }[];
  };
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{group.emoji ?? "💰"}</span>
              <div>
                <h3 className="font-semibold leading-none">{group.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {group.currency}
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              {group._count?.expenses ?? 0} expenses
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              {group.members.length} member
              {group.members.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
