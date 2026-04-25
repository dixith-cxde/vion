"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useNotifications } from "@/lib/hooks/use-notification";

import { AppWorkspaceSidebar } from "./app-workspace-sidebar";
import { getPageTitle, isNavItemActive } from "./sidebar-config";

export function AppSidebarShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { activeWorkspace, workspaces } = useWorkspace();
  const resolvedWorkspace = activeWorkspace ?? workspaces[0] ?? null;
  const workspaceId = resolvedWorkspace?.id;
  const { unreadCount } = useNotifications({ workspaceId });

  const pageTitle = useMemo(
    () => getPageTitle(pathname, workspaceId, resolvedWorkspace?.name),
    [pathname, workspaceId, resolvedWorkspace?.name],
  );

  if (pathname === "/") {
    return children;
  }

  return (
    <SidebarProvider defaultOpen>
      <AppWorkspaceSidebar pathname={pathname} />

      <SidebarInset className="md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" />

          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {resolvedWorkspace?.name ?? "Workspace"}
            </div>
            <div className="truncate text-sm font-semibold text-foreground">
              {pageTitle}
            </div>
          </div>

          {workspaceId ? (
            <Button
              asChild
              variant={
                isNavItemActive(
                  pathname,
                  `/workspaces/${workspaceId}/notification`,
                )
                  ? "secondary"
                  : "ghost"
              }
              size="icon-sm"
              className="relative"
            >
              <Link
                href={`/workspaces/${workspaceId}/notification`}
                aria-label="Open notifications"
              >
                <Bell className="size-4" />
                {unreadCount > 0 ? (
                  <>
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
                    <span className="sr-only">
                      {unreadCount} unread notifications
                    </span>
                  </>
                ) : null}
              </Link>
            </Button>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
