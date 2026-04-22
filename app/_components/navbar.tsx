"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { WorkspaceSwitcher } from "./ui/workspace-switcher";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings2Icon } from "lucide-react";

export default function Navbar() {
  const { user, isLoaded } = useUser();
  const { activeWorkspace } = useWorkspace();

  const wsId = activeWorkspace?.id;

  if (!isLoaded) return null;

  const isSignedIn = !!user;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 backdrop-blur md:px-6">
      {/* LEFT */}
      <div className="flex items-center gap-6">
        <Link
          href={`/workspaces/${wsId}`}
          className="text-xl font-black tracking-tight"
        >
          VION
        </Link>

        {isSignedIn && (
          <div className="flex items-center gap-2">
            <NavItem href={wsId ? `/workspaces/${wsId}/documents` : "#"}>
              Documents
            </NavItem>

            <NavItem href={wsId ? `/workspaces/${wsId}/tasks` : "#"}>
              Tasks
            </NavItem>

            <NavItem href={wsId ? `/workspaces/${wsId}/chat` : "#"}>
              Chat
            </NavItem>

            <NavItem href={wsId ? `/workspaces/${wsId}/graph` : "#"}>
              Graph
            </NavItem>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {!isSignedIn && (
          <>
            <SignInButton>
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </SignInButton>

            <SignUpButton>
              <Button size="sm">Sign Up</Button>
            </SignUpButton>
          </>
        )}

        {isSignedIn && (
          <>
            <Link href={`/workspaces/${wsId}/settings/members`}>
              <Settings2Icon className="size-4 cursor-pointer" />
            </Link>

            <Separator orientation="vertical" className="" />

            <WorkspaceSwitcher />

            <UserButton />
          </>
        )}
      </div>
    </header>
  );
}

function NavItem({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Button variant="ghost" size="sm">
        {children}
      </Button>
    </Link>
  );
}
