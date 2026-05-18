"use client";

import Image from "next/image";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  LoaderCircle,
  Mail,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

type WorkspaceData = {
  id: string;
  name: string;
  createdAt: string;
};

type WorkspaceMember = {
  id: string;
  role: MemberRole;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string | null;
  };
};

type Invitation = {
  id: string;
  email: string;
  role: MemberRole;
  status: string;
  createdAt: string;
};

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success?: false;
  message?: string;
};

export default function SettingsClient({ workspaceId }: { workspaceId: string }) {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [draftName, setDraftName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("MEMBER");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | MemberRole>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<WorkspaceMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  async function loadData(showRefreshState = false) {
    if (showRefreshState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const [workspaceRes, membersRes, invitationsRes] = await Promise.all([
        fetchJson<WorkspaceData>(`/api/workspaces/${workspaceId}`),
        fetchJson<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`),
        fetchJson<Invitation[]>(`/api/workspaces/${workspaceId}/invitations`),
      ]);

      setWorkspace(workspaceRes);
      setDraftName(workspaceRes.name);
      setMembers(membersRes);
      setInvitations(invitationsRes);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setError(null);

      try {
        const [workspaceRes, membersRes, invitationsRes] = await Promise.all([
          fetchJson<WorkspaceData>(`/api/workspaces/${workspaceId}`),
          fetchJson<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`),
          fetchJson<Invitation[]>(`/api/workspaces/${workspaceId}/invitations`),
        ]);

        if (cancelled) {
          return;
        }

        setWorkspace(workspaceRes);
        setDraftName(workspaceRes.name);
        setMembers(membersRes);
        setInvitations(invitationsRes);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const filteredMembers = members.filter((member) => {
    const matchesRole = roleFilter === "ALL" || member.role === roleFilter;
    const haystack = `${member.user.name} ${member.user.email} ${member.role}`.toLowerCase();
    const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
    return matchesRole && matchesSearch;
  });

  const filteredInvitations = invitations.filter((invite) => {
    const haystack = `${invite.email} ${invite.role} ${invite.status}`.toLowerCase();
    return !normalizedSearch || haystack.includes(normalizedSearch);
  });

  const adminCount = members.filter((member) => member.role !== "MEMBER").length;
  const ownerCount = members.filter((member) => member.role === "OWNER").length;
  const workspaceAgeLabel = workspace?.createdAt
    ? getWorkspaceAgeLabel(workspace.createdAt)
    : "Loading";

  async function refreshWithTransition() {
    startTransition(() => {
      void loadData(true);
    });
  }

  async function saveWorkspaceName() {
    const trimmedName = draftName.trim();

    if (!trimmedName || !workspace || trimmedName === workspace.name) {
      return;
    }

    setIsSavingName(true);
    setError(null);

    try {
      const updated = await fetchJson<Pick<WorkspaceData, "id" | "name">>(
        `/api/workspaces/${workspaceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: trimmedName }),
        }
      );

      setWorkspace((current) => (current ? { ...current, name: updated.name } : current));
      setDraftName(updated.name);
      toast({
        title: "Workspace updated",
        description: "Workspace name updated.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: getErrorMessage(err),
      });
    } finally {
      setIsSavingName(false);
    }
  }

  async function sendInvite() {
    const email = inviteEmail.trim();

    if (!email) {
      toast({
        variant: "destructive",
        title: "Invite failed",
        description: "Invite email is required.",
      });
      return;
    }

    setIsInviting(true);
    setError(null);

    try {
      await fetchJson<Invitation>(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role: inviteRole }),
      });

      setInviteEmail("");
      setInviteRole("MEMBER");
      toast({
        title: "Invitation sent",
        description: `Invitation sent to ${email}.`,
      });
      await refreshWithTransition();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Invite failed",
        description: getErrorMessage(err),
      });
    } finally {
      setIsInviting(false);
    }
  }

  async function cancelInvite(invitationId: string) {
    setActiveActionId(invitationId);
    setError(null);

    try {
      await fetchJson(`/api/invitations/${invitationId}`, {
        method: "DELETE",
      });
      toast({
        title: "Invitation canceled",
        description: "The pending invitation was canceled.",
      });
      await refreshWithTransition();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Cancellation failed",
        description: getErrorMessage(err),
      });
    } finally {
      setActiveActionId(null);
    }
  }

  async function updateRole(memberId: string, role: MemberRole) {
    setActiveActionId(memberId);
    setError(null);

    try {
      await fetchJson(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });
      toast({
        title: "Role updated",
        description: "The member role was updated.",
      });
      await refreshWithTransition();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Role update failed",
        description: getErrorMessage(err),
      });
    } finally {
      setActiveActionId(null);
    }
  }

  async function removeMember(member: WorkspaceMember) {
    setActiveActionId(member.id);
    setError(null);

    try {
      await fetchJson(`/api/workspaces/${workspaceId}/members/${member.id}`, {
        method: "DELETE",
      });
      toast({
        title: "Member removed",
        description: `${member.user.name || member.user.email} no longer has access.`,
      });
      await refreshWithTransition();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Removal failed",
        description: getErrorMessage(err),
      });
    } finally {
      setMemberPendingRemoval(null);
      setActiveActionId(null);
    }
  }

  return (
    <div className="min-h-full bg-background overflow-auto">
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
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
                  {members.length} active {members.length === 1 ? "member" : "members"}
                </InlineInfo>
                <InlineInfo icon={Mail}>
                  {invitations.length} pending {invitations.length === 1 ? "invite" : "invites"}
                </InlineInfo>
                <InlineInfo icon={CalendarDays}>{workspaceAgeLabel}</InlineInfo>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1 sm:min-w-80">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search members or invites"
                  className="h-10 rounded-lg border-border bg-background pl-9 shadow-none focus-visible:ring-0"
                />
              </div>

              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as "ALL" | MemberRole)}
              >
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
                onClick={() => refreshWithTransition()}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {error ? <StatusBanner>{error}</StatusBanner> : null}

        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border px-2 py-12">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading workspace settings
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="py-6">
              <SectionHeader
                title="Overview"
                description="A compact snapshot of workspace membership and invite state."
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={Users}
                  label="Total members"
                  value={members.length.toString()}
                  meta="People with workspace access"
                />
                <StatCard
                  icon={Shield}
                  label="Admins + owners"
                  value={adminCount.toString()}
                  meta={`${ownerCount} ${ownerCount === 1 ? "owner" : "owners"} in this workspace`}
                />
                <StatCard
                  icon={UserPlus}
                  label="Pending invites"
                  value={invitations.length.toString()}
                  meta="Awaiting acceptance"
                />
                <StatCard
                  icon={Clock3}
                  label="Workspace age"
                  value={workspaceAgeLabel}
                  meta={workspace?.createdAt ? formatDate(workspace.createdAt) : "Unknown"}
                />
              </div>
            </section>

            <section className="py-6">
              <SectionHeader
                title="Workspace"
                description="Basic workspace details pulled from the workspace record."
              />
              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="space-y-5 rounded-lg border p-5">
                  <div className="flex items-center gap-4 border-b pb-4">
                    <div className="flex size-12 items-center justify-center bg-foreground text-sm font-semibold text-background">
                      {getInitials(workspace?.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-foreground">
                        {workspace?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Created{" "}
                        {workspace?.createdAt ? formatDate(workspace.createdAt) : "recently"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-lg border-0 bg-muted px-3 py-1 text-muted-foreground"
                    >
                      {members.length} seats used
                    </Badge>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <FieldShell label="Workspace name">
                      <Input
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
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
                      onClick={saveWorkspaceName}
                      disabled={
                        isSavingName ||
                        !workspace ||
                        draftName.trim().length === 0 ||
                        draftName.trim() === workspace.name
                      }
                      className="h-10 rounded-lg px-5 shadow-none"
                    >
                      {isSavingName ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="size-4" />
                      )}
                      Save changes
                    </Button>
                  </div>
                </div>

                <div className="space-y-5 rounded-lg border p-5">
                  <SectionHeader
                    title="Invite people"
                    description="Send an invite and set the role before the user joins."
                    compact
                  />
                  <FieldShell label="Email address">
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="name@company.com"
                      className="h-10 rounded-lg border-border bg-background shadow-none focus-visible:ring-0"
                    />
                  </FieldShell>

                  <FieldShell label="Role">
                    <Select
                      value={inviteRole}
                      onValueChange={(value) => setInviteRole(value as MemberRole)}
                    >
                      <SelectTrigger className="h-10 w-full rounded-lg border-border bg-background px-3 shadow-none focus-visible:ring-0">
                        <SelectValue placeholder="Choose a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Member</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldShell>

                  <p className="text-sm leading-6 text-muted-foreground">
                    Members can collaborate across the workspace. Admins can invite people and
                    manage workspace membership.
                  </p>

                  <Button
                    onClick={sendInvite}
                    disabled={isInviting || inviteEmail.trim().length === 0}
                    className="h-10 rounded-lg px-5 shadow-none"
                  >
                    {isInviting ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    Send invitation
                  </Button>
                </div>
              </div>
            </section>

            <section className="py-6">
              <SectionHeader
                title="Pending invitations"
                description="Invitations stay here until accepted or canceled."
              />
              <div className="mt-4">
                {filteredInvitations.length === 0 ? (
                  <EmptyState
                    icon={Mail}
                    title="No pending invitations"
                    description="Once you invite someone, it will appear here with its assigned role."
                  />
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    {filteredInvitations.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex flex-col gap-4 border-b px-4 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {invite.email}
                            </p>
                            <RoleBadge role={invite.role} />
                            <Badge
                              variant="outline"
                              className="rounded-lg border-0 bg-amber-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-800"
                            >
                              {invite.status.toLowerCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Sent {formatDate(invite.createdAt)}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-lg px-3 text-muted-foreground shadow-none hover:bg-muted"
                          onClick={() => cancelInvite(invite.id)}
                          disabled={activeActionId === invite.id}
                        >
                          {activeActionId === invite.id ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="py-6">
              <SectionHeader
                title="Current members"
                description="Review the team, adjust roles, or remove access."
              />
              <div className="mt-4">
                {filteredMembers.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No members match this view"
                    description="Try changing the search term or role filter."
                  />
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    {filteredMembers.map((member) => {
                      const isOwner = member.role === "OWNER";
                      const isBusy = activeActionId === member.id;

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col gap-4 border-b px-4 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_180px_140px] lg:items-center">
                            <div className="flex min-w-0 items-center gap-4">
                              <p className="overflow-hidden rounded-full">
                                <AvatarCircle
                                  name={member.user.name}
                                  imageUrl={member.user.imageUrl}
                                />
                              </p>

                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-medium text-foreground sm:text-base">
                                    {member.user.name}
                                  </p>
                                  <RoleBadge role={member.role} />
                                </div>
                                <p className="truncate text-sm text-muted-foreground">
                                  {member.user.email}
                                </p>
                              </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                              Joined {formatDate(member.createdAt)}
                            </p>

                            <Select
                              value={member.role}
                              onValueChange={(value) => updateRole(member.id, value as MemberRole)}
                              disabled={isOwner || isBusy}
                            >
                              <SelectTrigger className="h-10 min-w-36 rounded-lg border-border bg-background shadow-none focus-visible:ring-0">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {isOwner ? (
                                  <SelectItem value="OWNER">Owner</SelectItem>
                                ) : (
                                  <>
                                    <SelectItem value="MEMBER">Member</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            variant="ghost"
                            className="h-9 rounded-lg px-3 text-muted-foreground shadow-none hover:bg-muted"
                            onClick={() => setMemberPendingRemoval(member)}
                            disabled={isOwner || isBusy}
                          >
                            {isBusy ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <AlertDialog
        open={memberPendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open && activeActionId === null) {
            setMemberPendingRemoval(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              {memberPendingRemoval
                ? `Remove ${memberPendingRemoval.user.name || memberPendingRemoval.user.email} from this workspace? They will lose access immediately.`
                : "This person will lose access immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={activeActionId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={memberPendingRemoval === null || activeActionId !== null}
              onClick={() => {
                if (memberPendingRemoval) {
                  void removeMember(memberPendingRemoval);
                }
              }}
            >
              {activeActionId !== null ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";

  let payload: ApiSuccess<T> | ApiFailure | null = null;

  if (contentType.includes("application/json")) {
    payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload && "message" in payload && payload.message ? payload.message : "Request failed."
    );
  }

  if (payload && "data" in payload) {
    return payload.data;
  }

  return undefined as T;
}

function StatCard({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: typeof Users;
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

function SectionHeader({
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

function InlineInfo({ icon: Icon, children }: { icon: typeof Users; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border-0 bg-muted px-3 py-1.5">
      <Icon className="size-3.5 text-muted-foreground" />
      <span>{children}</span>
    </span>
  );
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users;
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

function AvatarCircle({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
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

function RoleBadge({ role }: { role: MemberRole }) {
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

function StatusBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {children}
    </div>
  );
}

function createWorkspaceHandle(name?: string | null) {
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

function getInitials(value?: string | null) {
  if (!value) {
    return "WS";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "WS";
}

function formatRole(role: MemberRole) {
  return role.toLowerCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getWorkspaceAgeLabel(value: string) {
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong.";
}
