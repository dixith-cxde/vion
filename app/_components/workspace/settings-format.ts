import type { MemberRole } from "./settings-types";

export function createWorkspaceHandle(name?: string | null) {
  if (!name) {
    return "workspace-handle";
  }

  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace-handle"
  );
}

export function getInitials(value?: string | null) {
  if (!value) {
    return "WS";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "WS";
}

export function formatRole(role: MemberRole) {
  return role.toLowerCase();
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function getWorkspaceAgeLabel(value: string) {
  const createdAt = new Date(value).getTime();
  const diffInDays = Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24)));

  if (diffInDays === 0) {
    return "Today";
  }

  if (diffInDays < 30) {
    return `${diffInDays}d`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo`;
  }

  return `${Math.floor(diffInMonths / 12)}y`;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong.";
}
