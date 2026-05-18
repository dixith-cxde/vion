"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
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

      {/* Left side */}
      <div className="relative hidden w-[54%] border-r border-border/60 lg:flex">
        <div className="relative z-10 flex w-full flex-col justify-between p-14">
          {/* Top */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 backdrop-blur-xl">
              <div className="size-1.5 rounded-full bg-foreground/70" />

              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                VION Workspace
              </span>
            </div>

            <div className="mt-10 max-w-2xl">
              <h1 className="text-6xl font-black leading-[0.92] tracking-[-0.07em] text-foreground">
                Connected systems for collaborative engineering.
              </h1>

              <p className="mt-7 max-w-xl text-sm leading-7 text-muted-foreground">
                VION unifies documents, tasks, communication, relationships, and developer workflows
                into a single operational workspace designed for modern engineering teams.
              </p>
            </div>
          </div>

          {/* Middle feature stack */}
          <div className="grid max-w-2xl gap-4">
            <div className="group rounded-2xl border border-border/60 bg-background/50 p-5 transition-colors hover:bg-background/70">
              <div className="mb-4 flex items-center gap-2">
                <div className="size-2 rounded-full bg-violet-400/80" />

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Relationship Graph
                </span>
              </div>

              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Link documents, tasks, commits, and discussions.
              </h3>

              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Build contextual engineering workflows through entity relationships and navigable
                workspace connections.
              </p>
            </div>

            <div className="group rounded-2xl border border-border/60 bg-background/50 p-5 transition-colors hover:bg-background/70">
              <div className="mb-4 flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-400/80" />

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Real-Time Collaboration
                </span>
              </div>

              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Operational communication integrated directly into workflows.
              </h3>

              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Discussions, updates, mentions, notifications, and activity streams connected
                directly to workspace entities.
              </p>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-6 border-t border-border/50 pt-6 text-xs text-muted-foreground">
            <span>Documents</span>
            <span>Tasks</span>
            <span>Graph</span>
            <span>Notifications</span>
            <span>Chat</span>
          </div>
        </div>
      </div>

      {/* Right auth area */}
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
              Create account
            </h1>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Unified workspace for connected engineering workflows.
            </p>
          </div>

          {/* Auth card wrapper */}
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/70 shadow-2xl shadow-black/5 backdrop-blur-2xl flex flex-col justify-center items-center">
            {/* Header */}
            <div className="border-b border-border/50 px-6 py-5 flex flex-col justify-center items-center">
              <h2 className="mt-4 text-xl uppercase font-bold tracking-tight text-foreground text-center">
                Create your VION Account
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground text-center">
                Build connected engineering workflows with documents, tasks, communication, graph
                relationships, and operational collaboration in a unified workspace.
              </p>
            </div>

            {/* Clerk auth */}
            <div className="p-3">
              <SignUp
                appearance={{
                  elements: {
                    rootBox: "w-full",

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
