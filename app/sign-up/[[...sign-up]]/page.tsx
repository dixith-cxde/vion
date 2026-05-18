"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left branding section */}
      <div className="hidden border-r border-border/60 bg-muted/20 lg:flex lg:w-1/2">
        <div className="flex max-w-xl flex-col justify-center px-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            VION
          </p>

          <h1 className="text-5xl font-black tracking-[-0.06em] text-foreground">
            Build connected workspaces.
          </h1>

          <p className="mt-6 text-sm leading-7 text-muted-foreground">
            VION unifies documents, tasks, discussions, developer activity, and relationship graphs
            into a single operational workspace built for engineering collaboration.
          </p>

          <div className="mt-10 grid gap-4">
            <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-xl">
              <p className="text-sm font-medium text-foreground">
                Relationship-driven architecture
              </p>

              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                Connect tasks, documents, commits, conversations, and entities through a unified
                graph system.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 p-4 backdrop-blur-xl">
              <p className="text-sm font-medium text-foreground">
                Real-time collaborative workflows
              </p>

              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                Operational communication, task tracking, notifications, and workspace activity in a
                centralized environment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right auth section */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              VION
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-foreground">
              Create account
            </h1>
          </div>

          <SignUp
            appearance={{
              elements: {
                card: [
                  "shadow-none",
                  "border",
                  "border-border/60",
                  "bg-background/80",
                  "backdrop-blur-xl",
                ].join(" "),

                headerTitle: "hidden",

                headerSubtitle: "hidden",

                socialButtonsBlockButton: "border-border/60 hover:bg-muted/50",

                formButtonPrimary: "bg-foreground text-background hover:bg-foreground/90",

                footerActionLink: "text-foreground hover:text-foreground/80",

                formFieldInput: "border-border/60 focus:border-border focus:ring-0",

                dividerLine: "bg-border/60",

                dividerText: "text-muted-foreground",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
