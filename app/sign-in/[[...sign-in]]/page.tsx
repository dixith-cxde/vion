"use client";

import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "@/app/_components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="VION Workspace"
      title="Sign in to your workspace."
      description="Continue into a cleaner workspace for documents, tasks, channels, GitHub context, and graph navigation."
      panelTitle="Welcome back"
      panelDescription="Use your account to open the workspace and continue where your team left off."
    >
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full shadow-none",
            card: "border-0 bg-transparent p-0 shadow-none",
            header: "hidden",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton:
              "rounded-lg border-0 bg-violet-50 text-violet-950 hover:bg-violet-100 transition-colors shadow-none",
            socialButtonsBlockButtonText: "font-medium text-slate-900",
            formButtonPrimary:
              "rounded-lg bg-violet-600 text-white hover:bg-violet-700 shadow-none",
            footerActionLink: "text-violet-700 hover:text-violet-800",
            formFieldInput:
              "h-11 rounded-lg border-0 bg-white/80 ring-1 ring-slate-200 focus:border-transparent focus:ring-1 focus:ring-violet-300",
            formFieldLabel: "text-slate-600 font-medium",
            dividerLine: "bg-border/60",
            dividerText: "text-slate-500",
            formResendCodeLink: "text-violet-700 hover:text-violet-800",
            identityPreviewText: "text-slate-600",
            identityPreviewEditButton: "text-violet-700 hover:text-violet-800",
            footer: "border-t border-border/40 pt-5",
            footerActionText: "text-slate-500",
          },
        }}
      />
    </AuthShell>
  );
}
