import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Group details */}
      <div>
        <Skeleton className="mb-4 h-5 w-28" />
        <Skeleton className="mb-4 h-4 w-56" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>

      {/* Password protection */}
      <div>
        <Skeleton className="mb-1 h-5 w-36" />
        <Skeleton className="mb-4 h-4 w-52" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-11 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Members */}
      <div>
        <Skeleton className="mb-4 h-5 w-20" />
        <Skeleton className="mb-4 h-4 w-60" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
