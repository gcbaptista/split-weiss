import { revalidatePath } from "next/cache";

/**
 * Revalidate all group-scoped pages after a data mutation.
 */
export function revalidateGroupPages(groupId: string) {
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/balances`);
  revalidatePath(`/groups/${groupId}/settlements`);
  revalidatePath(`/groups/${groupId}/settings`);
}
