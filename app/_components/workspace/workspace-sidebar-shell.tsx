"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import {
  Bell,
  CheckSquare2,
  Files,
  LayoutDashboard,
  MessageSquareText,
  Network,
  Plus,
  Settings2,
} from "lucide-react";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { WorkspaceSwitcher } from "@/app/_components/ui/workspace-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useNotifications } from "@/lib/hooks/use-notification";

type WorkspaceSidebarShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

export function WorkspaceSidebarShell({
  children,
}: WorkspaceSidebarShellProps) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const { unreadCount } = useNotifications({ workspaceId });
  const isSignedIn = !!user;

  const navigation = useMemo(() => {
    if (!workspaceId) return [];

    return [
      {
        label: "Workspace",
        items: [
          {
            title: "Dashboard",
            href: `/workspaces/${workspaceId}`,
            icon: LayoutDashboard,
          },
          {
            title: "Documents",
            href: `/workspaces/${workspaceId}/documents`,
            icon: Files,
          },
          {
            title: "Tasks",
            href: `/workspaces/${workspaceId}/tasks`,
            icon: CheckSquare2,
          },
        ],
      },
      {
        label: "Collaboration",
        items: [
          {
            title: "Chat",
            href: `/workspaces/${workspaceId}/chat`,
            icon: MessageSquareText,
          },
          {
            title: "Graph",
            href: `/workspaces/${workspaceId}/graph`,
            icon: Network,
          },
        ],
      },
      {
        label: "Manage",
        items: [
          {
            title: "Notifications",
            href: `/workspaces/${workspaceId}/notification`,
            icon: Bell,
            badge: unreadCount,
          },
          {
            title: "Settings",
            href: `/workspaces/${workspaceId}/settings/members`,
            icon: Settings2,
          },
        ],
      },
    ];
  }, [workspaceId, unreadCount]);

  const pageTitle = useMemo(
    () => getPageTitle(pathname, workspaceId, activeWorkspace?.name),
    [pathname, workspaceId, activeWorkspace?.name],
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="gap-3 px-3 py-3">
          <Link
            href={workspaceId ? `/workspaces/${workspaceId}` : "/"}
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-sidebar-accent"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
              V
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">
                VION
              </div>
              <div className="truncate text-xs text-sidebar-foreground/70">
                Unified workspace
              </div>
            </div>
          </Link>

          <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 px-3 py-3 group-data-[collapsible=icon]:hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-sidebar-foreground">
                  {activeWorkspace?.name ?? "Loading workspace"}
                </div>
                <div className="text-xs text-sidebar-foreground/70">
                  Active workspace
                </div>
              </div>
              {activeWorkspace?.role ? (
                <Badge
                  variant="muted"
                  className="rounded-md px-2 py-0 text-[10px]"
                >
                  {activeWorkspace.role}
                </Badge>
              ) : null}
            </div>
            <WorkspaceSwitcher />
          </div>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent className="px-2 pb-2">
          {navigation.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      item={item}
                      isActive={isNavItemActive(pathname, item.href)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="px-3 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Create Workspace">
                <Link href="/workspaces/new">
                  <Plus />
                  <span>Create workspace</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {isSignedIn ? (
            <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/25 px-3 py-2 group-data-[collapsible=icon]:justify-center">
              <UserButton />
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="text-sm font-medium text-sidebar-foreground">
                  Account
                </div>
                <div className="text-xs text-sidebar-foreground/70">
                  Profile and session controls
                </div>
              </div>
            </div>
          ) : null}

          {!isSignedIn ? (
            <div className="space-y-2 group-data-[collapsible=icon]:hidden">
              <SignInButton>
                <Button variant="outline" className="w-full justify-center">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button className="w-full justify-center">Sign Up</Button>
              </SignUpButton>
            </div>
          ) : null}
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-1 hidden data-vertical:h-4 sm:block"
          />

          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {activeWorkspace?.name ?? "Workspace"}
            </div>
            <div className="truncate text-sm font-semibold text-foreground">
              {pageTitle}
            </div>
          </div>

          {workspaceId ? (
            <Button
              asChild
              variant={
                isNavItemActive(pathname, `/workspaces/${workspaceId}/notification`)
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

function SidebarNavItem({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
        <Link href={item.href}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {item.badge && item.badge > 0 ? (
        <SidebarMenuBadge>{item.badge > 99 ? "99+" : item.badge}</SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}

function isNavItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return href !== "/" && pathname.startsWith(`${href}/`);
}

function getPageTitle(
  pathname: string,
  workspaceId?: string,
  workspaceName?: string,
) {
  const workspaceRoot = workspaceId ? `/workspaces/${workspaceId}` : "";
  const pageMap = [
    { match: `${workspaceRoot}/settings`, title: "Workspace settings" },
    { match: `${workspaceRoot}/notification`, title: "Notifications" },
    { match: `${workspaceRoot}/documents`, title: "Documents" },
    { match: `${workspaceRoot}/tasks`, title: "Tasks" },
    { match: `${workspaceRoot}/chat`, title: "Chat" },
    { match: `${workspaceRoot}/graph`, title: "Graph" },
    {
      match: workspaceRoot,
      title: workspaceName ? `${workspaceName} overview` : "Workspace overview",
    },
  ].filter((item) => item.match);

  const match = pageMap.find(
    (item) => pathname === item.match || pathname.startsWith(`${item.match}/`),
  );

  return match?.title ?? "Workspace";
}
