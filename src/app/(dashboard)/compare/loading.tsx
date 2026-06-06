import { Skeleton } from "@/components/shared/skeleton";

export default function CompareLoading() {
  return (
    <div className="container max-w-7xl py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-48" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}
