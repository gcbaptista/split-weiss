import { Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    emoji?: string | null;
    currency: string;
    _count: { members: number; expenses: number };
  };
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={`/groups/${group.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {group.emoji && <span className="text-2xl">{group.emoji}</span>}
              <div>
                <h3 className="font-semibold leading-none">{group.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{group.currency}</p>
              </div>
            </div>
            <Badge variant="secondary">{group._count.expenses} expenses</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              {group._count.members} member
              {group._count.members !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
