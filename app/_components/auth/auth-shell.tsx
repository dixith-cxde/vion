"use client";

import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  panelTitle: string;
  panelDescription: string;
  children: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  panelTitle,
  panelDescription,
  children,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(237,233,254,0.9),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(224,242,254,0.9),transparent_34%),linear-gradient(180deg,#f8fafc,#ffffff)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />

      <div className="relative z-10 grid min-h-screen w-full lg:grid-cols-[1.08fr_0.92fr]">
        <div className="hidden border-r border-border/50 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-16">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {eyebrow}
            </p>
            <h1 className="mt-6 text-6xl font-semibold tracking-[-0.06em] text-slate-950">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">{description}</p>
          </div>

          <div className="grid max-w-2xl gap-6">
            <div className="grid gap-6 border-l border-slate-200 pl-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-violet-700">Documents, tasks, channels, code</p>
                <p className="text-sm leading-7 text-slate-600">
                  VION keeps engineering context in one place instead of scattering it across tabs.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-sky-700">Relationship-first workspace graph</p>
                <p className="text-sm leading-7 text-slate-600">
                  Move between linked entities with a cleaner operational view of the workspace.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center px-6 py-10 lg:px-12">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-3 lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {eyebrow}
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.05em] text-slate-950">{title}</h1>
              <p className="text-sm leading-7 text-slate-600">{description}</p>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <div className="mb-6 space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  {panelTitle}
                </h2>
                <p className="text-sm leading-6 text-slate-600">{panelDescription}</p>
              </div>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
