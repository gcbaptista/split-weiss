import { GroupForm } from "@/components/groups/group-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewGroupPage() {
  return (
    <div className="mx-auto w-full max-w-lg">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
          <CardDescription>
            Start a group and add people by name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GroupForm />
        </CardContent>
      </Card>
    </div>
  );
}
