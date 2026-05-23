"use client";

import {
  Bell,
  CheckSquare2,
  Files,
  FolderGit2,
  LayoutDashboard,
  MessageSquareText,
  Network,
  Settings2,
} from "lucide-react";

type IconType = React.ComponentType<{ className?: string }>;

export type NavItem = {
  title: string;
  href: string;
  icon: IconType;
  badge?: number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export function buildSidebarNavigation(
  workspaceId: string | undefined,
  unreadCount: number,
): NavGroup[] {
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
        {
          title: "GitHub",
          href: `/workspaces/${workspaceId}/github`,
          icon: FolderGit2,
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
}

export function isNavItemActive(pathname: string, href: string) {
  if (pathname === href) return true;
  return href !== "/" && pathname.startsWith(`${href}/`);
}

export function getPageTitle(
  pathname: string,
  workspaceId?: string,
  workspaceName?: string,
) {
  const workspaceRoot = workspaceId ? `/workspaces/${workspaceId}` : "";
  const pageMap = [
    { match: "/dashboard", title: "Dashboard" },
    { match: "/workspaces/new", title: "Create workspace" },
    { match: `${workspaceRoot}/settings`, title: "Workspace settings" },
    { match: `${workspaceRoot}/notification`, title: "Notifications" },
    { match: `${workspaceRoot}/documents`, title: "Documents" },
    { match: `${workspaceRoot}/tasks`, title: "Tasks" },
    { match: `${workspaceRoot}/chat`, title: "Chat" },
    { match: `${workspaceRoot}/graph`, title: "Graph" },
    { match: `${workspaceRoot}/github`, title: "GitHub" },
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
