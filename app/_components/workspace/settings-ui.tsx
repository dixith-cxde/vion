"use client";

import Image from "next/image";
import {
  BadgeCheck,
  CalendarDays,
  LoaderCircle,
  Mail,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWorkspaceHandle, formatDate, formatRole } from "./settings-format";
import { getInitials } from "./settings-format";
import type { MemberRole, WorkspaceData } from "./settings-types";

export function StatCard({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <p className="text-sm">{label}</p>
      </div>
      <p className="text-2xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function InlineInfo({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border-0 bg-muted px-3 py-1.5">
      <Icon className="size-3.5 text-muted-foreground" />
      <span>{children}</span>
    </span>
  );
}

export function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border px-6 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function AvatarCircle({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  if (imageUrl) {
    return (
      <Image src={imageUrl} alt={name} width={48} height={48} className="size-12 object-cover" />
    );
  }

  return (
    <div className="flex size-12 items-center justify-center bg-muted text-sm font-semibold text-foreground">
      {getInitials(name)}
    </div>
  );
}

export function RoleBadge({ role }: { role: MemberRole }) {
  const className =
    role === "OWNER"
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : role === "ADMIN"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <Badge
      variant="outline"
      className={`rounded-lg border-0 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${className}`}
    >
      {formatRole(role)}
    </Badge>
  );
}

export function StatusBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  );
}

export function SettingsHeader({
  memberCount,
  inviteCount,
  ageLabel,
  search,
  roleFilter,
  isRefreshing,
  onSearchChange,
  onRoleFilterChange,
  onRefresh,
}: {
  memberCount: number;
  inviteCount: number;
  ageLabel: string;
  search: string;
  roleFilter: "ALL" | MemberRole;
  isRefreshing: boolean;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: "ALL" | MemberRole) => void;
  onRefresh: () => void;
}) {
  return (
    <section className="pb-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <Badge
            variant="outline"
            className="rounded-full border-0 bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
          >
            Workspace settings
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-[2.25rem]">
              Team members
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Manage membership, invitations, and workspace identity with a simpler full-width
              layout.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <InlineInfo icon={Users}>
              {memberCount} active {memberCount === 1 ? "member" : "members"}
            </InlineInfo>
            <InlineInfo icon={Mail}>
              {inviteCount} pending {inviteCount === 1 ? "invite" : "invites"}
            </InlineInfo>
            <InlineInfo icon={CalendarDays}>{ageLabel}</InlineInfo>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-80">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search members or invites"
              className="h-10 rounded-lg border-border bg-background pl-9 shadow-none focus-visible:ring-0"
            />
          </div>
          <Select value={roleFilter} onValueChange={(value) => onRoleFilterChange(value as "ALL" | MemberRole)}>
            <SelectTrigger className="h-10 min-w-40 rounded-lg border-border bg-background px-3 shadow-none focus-visible:ring-0">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="OWNER">Owners</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
              <SelectItem value="MEMBER">Members</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-10 rounded-lg border-border bg-muted px-4 shadow-none"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Refresh
          </Button>
        </div>
      </div>
    </section>
  );
}

export function WorkspaceDetails({
  workspace,
  draftName,
  memberCount,
  isSaving,
  onNameChange,
  onSave,
}: {
  workspace: WorkspaceData | null;
  draftName: string;
  memberCount: number;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5 rounded-lg border p-5">
      <div className="flex items-center gap-4 border-b pb-4">
        <div className="flex size-12 items-center justify-center bg-foreground text-sm font-semibold text-background">
          {getInitials(workspace?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-foreground">{workspace?.name}</p>
          <p className="text-sm text-muted-foreground">
            Created {workspace?.createdAt ? formatDate(workspace.createdAt) : "recently"}
          </p>
        </div>
        <Badge variant="outline" className="rounded-lg border-0 bg-muted px-3 py-1 text-muted-foreground">
          {memberCount} seats used
        </Badge>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <FieldShell label="Workspace name">
          <Input
            value={draftName}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Workspace name"
            className="h-10 rounded-lg border-border bg-background shadow-none focus-visible:ring-0"
          />
        </FieldShell>
        <FieldShell label="Workspace handle">
          <div className="flex h-10 items-center rounded-lg border px-3 text-sm text-muted-foreground">
            {createWorkspaceHandle(workspace?.name)}
          </div>
        </FieldShell>
      </div>
      <FieldShell label="Workspace ID">
        <div className="flex h-10 items-center rounded-lg border px-3 font-mono text-xs text-muted-foreground">
          {workspace?.id}
        </div>
      </FieldShell>
      <div className="flex justify-start">
        <Button
          onClick={onSave}
          disabled={isSaving || !workspace || draftName.trim().length === 0 || draftName.trim() === workspace.name}
          className="h-10 rounded-lg px-5 shadow-none"
        >
          {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
