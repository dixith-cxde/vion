"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { Plus, Verified } from "lucide-react";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { WorkspaceSwitcher } from "@/app/_components/ui/workspace-switcher";
import { CreateWorkspaceDialog } from "@/app/_components/workspace/create-workspace-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useNotifications } from "@/lib/hooks/use-notification";

import {
  buildSidebarNavigation,
  isNavItemActive,
  type NavGroup,
} from "./sidebar-config";
import { SidebarNavItem } from "./sidebar-nav-item";

export function AppWorkspaceSidebar({ pathname }: { pathname: string }) {
  const { user } = useUser();
  const { activeWorkspace, workspaces } = useWorkspace();
  const resolvedWorkspace = activeWorkspace ?? workspaces[0] ?? null;
  const workspaceId = resolvedWorkspace?.id;
  const { unreadCount } = useNotifications({ workspaceId });
  const navigation = buildSidebarNavigation(workspaceId, unreadCount);
  const isSignedIn = !!user;

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-3 px-2 py-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="VION workspace"
              className="h-10 group-data-[collapsible=icon]:justify-center"
            >
              <Link href={workspaceId ? `/workspaces/${workspaceId}` : "/"}>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-primary-foreground">
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
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <div className="rounded-sm bg-sidebar-accent/35 px-3 py-3 group-data-[collapsible=icon]:hidden">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-sidebar-foreground">
                {resolvedWorkspace?.name ?? "Loading workspace"}
              </div>
              <div className="text-xs text-sidebar-foreground/70">
                Active workspace
              </div>
            </div>
            {resolvedWorkspace?.role ? (
              <Badge
                variant="secondary"
                className="rounded-md px-2 py-0 text-[10px]"
              >
                {resolvedWorkspace.role}
              </Badge>
            ) : null}
          </div>
          <WorkspaceSwitcher />
        </div>
      </SidebarHeader>

      <SidebarSeparator
        orientation="horizontal"
        className="mx-0 w-full group-data-[collapsible=icon]:hidden"
      />

      <SidebarContent className="px-2 pb-2 group-data-[collapsible=icon]:px-0">
        {navigation.map((group: NavGroup) => (
          <SidebarGroup
            key={group.label}
            className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-0"
          >
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="group-data-[collapsible=icon]:items-center">
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

      <SidebarFooter className="px-3 py-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <CreateWorkspaceDialog>
              <SidebarMenuButton
                tooltip="Create Workspace"
                className="group-data-[collapsible=icon]:justify-center"
              >
                <Plus />
                <span>Create workspace</span>
              </SidebarMenuButton>
            </CreateWorkspaceDialog>
          </SidebarMenuItem>
        </SidebarMenu>

        {isSignedIn ? (
          <div className="group flex w-full items-center gap-3 px-3 py-2 group-hover:cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <UserButton />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="text-sm font-medium text-sidebar-foreground">
                {user?.fullName}
              </div>
              <div className="text-xs text-sidebar-foreground/70">
                {user?.hasVerifiedEmailAddress ? (
                  <p className="flex items-center gap-1 truncate">
                    {user.primaryEmailAddress?.toString()}
                    <Verified className="size-5 fill-blue-600 stroke-white" />
                  </p>
                ) : null}
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
  );
}
