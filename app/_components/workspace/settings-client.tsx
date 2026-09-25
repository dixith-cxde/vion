"use client";

import { Clock3, LoaderCircle, Shield, UserPlus, Users } from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { formatDate, getErrorMessage, getWorkspaceAgeLabel } from "./settings-format";
import type { Invitation, MemberRole, WorkspaceData, WorkspaceMember } from "./settings-types";
import {
  deleteInvitation,
  deleteMember,
  loadSettingsData,
  patchMemberRole,
  patchWorkspaceName,
  postInvite,
} from "./settings-api";
import {
  SectionHeader,
  SettingsHeader,
  StatCard,
  StatusBanner,
  WorkspaceDetails,
} from "./settings-ui";
import {
  InviteForm,
  MembersList,
  PendingInvitations,
  RemoveMemberDialog,
} from "./settings-members";

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
    if (showRefreshState) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const data = await loadSettingsData(workspaceId);
      setWorkspace(data.workspace);
      setDraftName(data.workspace.name);
      setMembers(data.members);
      setInvitations(data.invitations);
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
        const data = await loadSettingsData(workspaceId);
        if (cancelled) return;
        setWorkspace(data.workspace);
        setDraftName(data.workspace.name);
        setMembers(data.members);
        setInvitations(data.invitations);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
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
    return matchesRole && (!normalizedSearch || haystack.includes(normalizedSearch));
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
    if (!trimmedName || !workspace || trimmedName === workspace.name) return;
    setIsSavingName(true);
    setError(null);
    try {
      const updated = await patchWorkspaceName(workspaceId, trimmedName);
      setWorkspace((current) => (current ? { ...current, name: updated.name } : current));
      setDraftName(updated.name);
      toast({ title: "Workspace updated", description: "Workspace name updated." });
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: getErrorMessage(err) });
    } finally {
      setIsSavingName(false);
    }
  }

  async function sendInvite() {
    const email = inviteEmail.trim();
    if (!email) {
      toast({ variant: "destructive", title: "Invite failed", description: "Invite email is required." });
      return;
    }
    setIsInviting(true);
    setError(null);
    try {
      await postInvite(workspaceId, email, inviteRole);
      setInviteEmail("");
      setInviteRole("MEMBER");
      toast({ title: "Invitation sent", description: `Invitation sent to ${email}.` });
      await refreshWithTransition();
    } catch (err) {
      toast({ variant: "destructive", title: "Invite failed", description: getErrorMessage(err) });
    } finally {
      setIsInviting(false);
    }
  }

  async function cancelInvite(invitationId: string) {
    setActiveActionId(invitationId);
    setError(null);
    try {
      await deleteInvitation(invitationId);
      toast({ title: "Invitation canceled", description: "The pending invitation was canceled." });
      await refreshWithTransition();
    } catch (err) {
      toast({ variant: "destructive", title: "Cancellation failed", description: getErrorMessage(err) });
    } finally {
      setActiveActionId(null);
    }
  }

  async function updateRole(memberId: string, role: MemberRole) {
    setActiveActionId(memberId);
    setError(null);
    try {
      await patchMemberRole(workspaceId, memberId, role);
      toast({ title: "Role updated", description: "The member role was updated." });
      await refreshWithTransition();
    } catch (err) {
      toast({ variant: "destructive", title: "Role update failed", description: getErrorMessage(err) });
    } finally {
      setActiveActionId(null);
    }
  }

  async function removeMember(member: WorkspaceMember) {
    setActiveActionId(member.id);
    setError(null);
    try {
      await deleteMember(workspaceId, member.id);
      toast({
        title: "Member removed",
        description: `${member.user.name || member.user.email} no longer has access.`,
      });
      await refreshWithTransition();
    } catch (err) {
      toast({ variant: "destructive", title: "Removal failed", description: getErrorMessage(err) });
    } finally {
      setMemberPendingRemoval(null);
      setActiveActionId(null);
    }
  }

  return (
    <div className="min-h-full bg-background overflow-auto">
      <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
        <SettingsHeader
          memberCount={members.length}
          inviteCount={invitations.length}
          ageLabel={workspaceAgeLabel}
          search={search}
          roleFilter={roleFilter}
          isRefreshing={isRefreshing}
          onSearchChange={setSearch}
          onRoleFilterChange={setRoleFilter}
          onRefresh={() => refreshWithTransition()}
        />
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
              <SectionHeader title="Overview" description="A compact snapshot of workspace membership and invite state." />
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Users} label="Total members" value={members.length.toString()} meta="People with workspace access" />
                <StatCard icon={Shield} label="Admins + owners" value={adminCount.toString()} meta={`${ownerCount} ${ownerCount === 1 ? "owner" : "owners"} in this workspace`} />
                <StatCard icon={UserPlus} label="Pending invites" value={invitations.length.toString()} meta="Awaiting acceptance" />
                <StatCard icon={Clock3} label="Workspace age" value={workspaceAgeLabel} meta={workspace?.createdAt ? formatDate(workspace.createdAt) : "Unknown"} />
              </div>
            </section>
            <section className="py-6">
              <SectionHeader title="Workspace" description="Basic workspace details pulled from the workspace record." />
              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <WorkspaceDetails
                  workspace={workspace}
                  draftName={draftName}
                  memberCount={members.length}
                  isSaving={isSavingName}
                  onNameChange={setDraftName}
                  onSave={saveWorkspaceName}
                />
                <InviteForm
                  email={inviteEmail}
                  role={inviteRole}
                  isInviting={isInviting}
                  onEmailChange={setInviteEmail}
                  onRoleChange={setInviteRole}
                  onSubmit={sendInvite}
                />
              </div>
            </section>
            <PendingInvitations invitations={filteredInvitations} activeActionId={activeActionId} onCancel={cancelInvite} />
            <MembersList members={filteredMembers} activeActionId={activeActionId} onRoleChange={updateRole} onRequestRemove={setMemberPendingRemoval} />
          </div>
        )}
      </div>
      <RemoveMemberDialog
        member={memberPendingRemoval}
        isBusy={activeActionId !== null}
        onClose={() => setMemberPendingRemoval(null)}
        onConfirm={(member) => void removeMember(member)}
      />
    </div>
  );
}
