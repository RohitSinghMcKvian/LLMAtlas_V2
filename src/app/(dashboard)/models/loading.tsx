import { Skeleton } from "@/components/shared/skeleton";

export default function ModelsLoading() {
  return (
    <div className="container max-w-7xl py-8 space-y-6">
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}
