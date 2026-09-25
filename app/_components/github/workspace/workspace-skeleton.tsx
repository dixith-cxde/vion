"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function GithubWorkspaceSkeleton() {
  return (
    <div className="space-y-5 px-6 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
