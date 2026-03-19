import { Skeleton } from "@/components/ui/skeleton";

export default function GroupExpensesLoading() {
  return (
    <div className="space-y-2 pt-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border bg-card p-4"
        >
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="ml-4 h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

