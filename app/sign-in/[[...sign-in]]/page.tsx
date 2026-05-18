"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center border-r border-border bg-muted/20">
        <div className="max-w-md px-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            VION
          </p>

          <h1 className="text-5xl font-black tracking-[-0.06em] text-foreground">
            Unified Developer Workspace
          </h1>

          <p className="mt-6 text-sm leading-7 text-muted-foreground">
            Relationship-driven workspace integrating documents, tasks, communication, graph
            visualization, and developer activity into a unified operational system.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md">
          <SignIn
            appearance={{
              elements: {
                card: "shadow-none border border-border",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
