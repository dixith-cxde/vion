"use client";

import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "@/app/_components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="VION Workspace"
      title="Create a workspace account."
      description="Start with a lighter, more focused entry point into the product instead of a marketing-heavy auth screen."
      panelTitle="Create account"
      panelDescription="Set up your account and move straight into the workspace."
    >
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full shadow-none",
            card: "border-0 bg-transparent p-0 shadow-none",
            header: "hidden",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton:
              "rounded-lg border-0 bg-sky-50 text-sky-950 hover:bg-sky-100 transition-colors shadow-none",
            socialButtonsBlockButtonText: "font-medium text-slate-900",
            formButtonPrimary:
              "rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-none",
            footerActionLink: "text-sky-700 hover:text-sky-800",
            formFieldInput:
              "h-11 rounded-lg border-0 bg-white/80 ring-1 ring-slate-200 focus:border-transparent focus:ring-1 focus:ring-sky-300",
            formFieldLabel: "text-slate-600 font-medium",
            dividerLine: "bg-border/60",
            dividerText: "text-slate-500",
            formResendCodeLink: "text-sky-700 hover:text-sky-800",
            identityPreviewText: "text-slate-600",
            identityPreviewEditButton: "text-sky-700 hover:text-sky-800",
            footer: "border-t border-border/40 pt-5",
            footerActionText: "text-slate-500",
          },
        }}
      />
    </AuthShell>
  );
}
