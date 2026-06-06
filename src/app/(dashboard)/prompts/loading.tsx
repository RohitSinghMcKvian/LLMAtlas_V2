import { Skeleton } from "@/components/shared/skeleton";

export default function PromptsLoading() {
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <Skeleton className="h-9 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}
