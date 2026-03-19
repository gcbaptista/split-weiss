import { Skeleton } from "@/components/ui/skeleton";

export default function BalancesLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Grand total header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-2 border-b bg-muted/20">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12 hidden sm:block" />
          <Skeleton className="h-3 w-12 hidden sm:block" />
          <Skeleton className="h-3 w-12" />
        </div>

        {/* Member rows */}
        <div className="divide-y">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 px-4 py-3">
              <Skeleton className="h-4 w-4" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-16 sm:w-20 hidden sm:block" />
              <Skeleton className="h-4 w-16 sm:w-20 hidden sm:block" />
              <Skeleton className="h-4 w-16 sm:w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
