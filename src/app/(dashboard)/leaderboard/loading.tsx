import { Skeleton } from "@/components/shared/skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}
