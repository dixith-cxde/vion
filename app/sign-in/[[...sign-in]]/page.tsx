"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      {/* Background grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Left section */}
      <div className="relative hidden w-[54%] border-r border-border/60 lg:flex">
        <div className="relative z-10 flex w-full flex-col justify-between p-14">
          {/* Top branding */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 backdrop-blur-xl">
              <div className="size-1.5 rounded-full bg-foreground/70" />

              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                VION Workspace
              </span>
            </div>

            <div className="mt-10 max-w-2xl">
              <h1 className="text-6xl font-black leading-[0.92] tracking-[-0.07em] text-foreground">
                Operational workflows for modern engineering teams.
              </h1>

              <p className="mt-7 max-w-xl text-sm leading-7 text-muted-foreground">
                VION connects documents, tasks, communication, notifications, graph relationships,
                and developer activity into a unified workspace platform built for collaborative
                software development.
              </p>
            </div>
          </div>

          {/* Middle cards */}
          <div className="grid max-w-2xl gap-4">
            <div className="group rounded-2xl border border-border/60 bg-background/50 p-5 transition-colors hover:bg-background/70">
              <div className="mb-4 flex items-center gap-2">
                <div className="size-2 rounded-full bg-cyan-400/80" />

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Unified Workspace
                </span>
              </div>

              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Centralize engineering workflows in one operational system.
              </h3>

              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Replace disconnected tooling with an integrated workspace built around relationships
                between entities, activity, and collaboration.
              </p>
            </div>

            <div className="group rounded-2xl border border-border/60 bg-background/50 p-5 transition-colors hover:bg-background/70">
              <div className="mb-4 flex items-center gap-2">
                <div className="size-2 rounded-full bg-violet-400/80" />

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Entity Relationships
                </span>
              </div>

              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Connect documents, tasks, discussions, and code activity.
              </h3>

              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Navigate contextual relationships through linked entities and graph-driven workspace
                organization.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-6 border-t border-border/50 pt-6 text-xs text-muted-foreground">
            <span>Tasks</span>
            <span>Documents</span>
            <span>Graph</span>
            <span>Chat</span>
            <span>Notifications</span>
          </div>
        </div>
      </div>

      {/* Right auth section */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-muted/10" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-8 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 backdrop-blur-xl">
              <div className="size-1.5 rounded-full bg-foreground/70" />

              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                VION
              </span>
            </div>

            <h1 className="mt-6 text-5xl font-black tracking-[-0.06em] text-foreground">
              Welcome back
            </h1>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Sign in to continue to your connected workspace environment.
            </p>
          </div>

          {/* Auth container */}
          <div className="overflow-hidden border border-border/60 shadow-2xl shadow-black/5 backdrop-blur-2xl bg-transparent rounded-sm">
            {/* Clerk component */}
            <div className="p-3 flex flex-col justify-center items-center">
              <div className=" py-5 flex flex-col justify-center items-center">
                <h2 className="mt-4 text-4xl font-bold tracking-tight text-foreground">
                  Sign in to VION
                </h2>

                <p className="mt-1 text-sm leading-6 text-muted-foreground text-center">
                  Access your workspace, documents, tasks, and operational collaboration
                  environment.
                </p>
              </div>
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "w-full shadow-none",
                    card: ["shadow-none", "border-0", "bg-transparent", "backdrop-blur-none"].join(
                      " "
                    ),
                    header: "hidden",

                    headerTitle: "hidden",

                    headerSubtitle: "hidden",

                    socialButtonsBlockButton:
                      "border-border/60 hover:bg-muted/50 transition-colors",

                    socialButtonsBlockButtonText: "font-medium text-foreground",

                    formButtonPrimary:
                      "bg-foreground text-background hover:bg-foreground/90 shadow-none",

                    footerActionLink: "text-foreground hover:text-foreground/80",
                    formFieldInput:
                      "border-border/60 bg-background/60 focus:border-border focus:ring-0",
                    formFieldLabel: "text-muted-foreground font-medium",
                    dividerLine: "bg-border/60",
                    dividerText: "text-muted-foreground",
                    formResendCodeLink: "text-foreground hover:text-foreground/80",
                    identityPreviewText: "text-muted-foreground",
                    identityPreviewEditButton: "text-foreground hover:text-foreground/80",
                    footer: "border-t border-border/40 pt-5",
                    footerActionText: "text-muted-foreground",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
