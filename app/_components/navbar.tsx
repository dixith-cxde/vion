"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";

export default function Navbar() {
  const { activeWorkspace } = useWorkspace();

  const wsId = activeWorkspace?.id;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#eceff6] bg-[#fcfcfe]/95 px-4 backdrop-blur md:px-6">
      {/* LEFT */}
      <div className="flex items-center gap-4 md:gap-6">
        <Link
          href="/"
          className="text-[#171821] transition-colors hover:text-[#4f5668] font-black text-xl"
        >
          VION
        </Link>

        <Show when={"signed-in"}>
          <nav className="flex items-center gap-1 rounded-full border border-[#e7ebf3] bg-[#f4f7fb] p-1 text-sm text-[#707789]">
            <Link
              href={wsId ? `/workspaces/${wsId}/documents` : "#"}
              className="rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-white hover:text-[#171821]"
            >
              Documents
            </Link>

            <Link
              href={wsId ? `/workspaces/${wsId}/tasks` : "#"}
              className="rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-white hover:text-[#171821]"
            >
              Tasks
            </Link>

            <Link
              href={wsId ? `/workspaces/${wsId}/chat` : "#"}
              className="rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-white hover:text-[#171821]"
            >
              Chat
            </Link>

            <Link
              href={wsId ? `/workspaces/${wsId}/graph` : "#"}
              className="rounded-full px-3 py-1.5 font-medium transition-colors hover:bg-white hover:text-[#171821]"
            >
              Graph
            </Link>
          </nav>
        </Show>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton>
            <button className="rounded-full border border-[#e7ebf3] bg-white px-4 py-2 text-sm font-medium text-[#5f6574] transition-colors hover:border-[#d8deea] hover:text-[#171821] cursor-pointer">
              Sign In
            </button>
          </SignInButton>

          <SignUpButton>
            <button className="cursor-pointer rounded-full border border-[#171821] bg-[#171821] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2e3a]">
              Sign Up
            </button>
          </SignUpButton>
        </Show>

        <Show when="signed-in">
          <div className="text-sm font-medium">
            {activeWorkspace?.name || "Loading..."}
          </div>

          <UserButton />
        </Show>
      </div>
    </header>
  );
}
