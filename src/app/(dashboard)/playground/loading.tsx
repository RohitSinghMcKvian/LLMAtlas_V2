import { Skeleton } from "@/components/shared/skeleton";

export default function PlaygroundLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b">
        <div className="container max-w-6xl py-3 flex items-center gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-40" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
      <div className="flex-1 container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
      <div className="border-t">
        <div className="container max-w-4xl py-4">
          <Skeleton className="h-20" />
        </div>
      </div>
    </div>
  );
}
