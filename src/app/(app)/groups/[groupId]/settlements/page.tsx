import { getGroupSettlements } from "@/app/actions/settlement.actions";
import { SettlementList } from "@/components/settlements/settlement-list";

interface PageProps {
  params: Promise<{ groupId: string }>;
}

export default async function SettlementsPage({ params }: PageProps) {
  const { groupId } = await params;
  const settlements = await getGroupSettlements(groupId);
  return (
    <div>
      <h2 className="mb-4 font-semibold">Settlement history</h2>
      <SettlementList settlements={settlements} />
    </div>
  );
}
