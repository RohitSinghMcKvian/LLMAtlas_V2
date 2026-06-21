import { Skeleton } from "@/components/shared/skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Hero */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-4 items-end">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>

      {/* Tabs + table */}
      <Skeleton className="h-10 w-80 rounded-lg" />
      <div className="grid lg:grid-cols-5 gap-6">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl lg:col-span-3" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
      </div>
    </div>
  );
}
