"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GithubRepositorySkeleton() {
  return (
    <div className="space-y-5 px-6 py-5">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
