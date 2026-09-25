"use client";

import { LoaderCircle, Mail, Trash2, UserPlus, Users } from "lucide-react";

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
import { formatDate } from "./settings-format";
import type { Invitation, MemberRole, WorkspaceMember } from "./settings-types";
import { AvatarCircle, EmptyState, FieldShell, RoleBadge, SectionHeader } from "./settings-ui";

export function InviteForm({
  email,
  role,
  isInviting,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: {
  email: string;
  role: MemberRole;
  isInviting: boolean;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: MemberRole) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-5 rounded-lg border p-5">
      <SectionHeader
        title="Invite people"
        description="Send an invite and set the role before the user joins."
        compact
      />
      <FieldShell label="Email address">
        <Input
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="name@company.com"
          className="h-10 rounded-lg border-border bg-background shadow-none focus-visible:ring-0"
        />
      </FieldShell>
      <FieldShell label="Role">
        <Select value={role} onValueChange={(value) => onRoleChange(value as MemberRole)}>
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
        Members can collaborate across the workspace. Admins can invite people and manage workspace
        membership.
      </p>
      <Button
        onClick={onSubmit}
        disabled={isInviting || email.trim().length === 0}
        className="h-10 rounded-lg px-5 shadow-none"
      >
        {isInviting ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        Send invitation
      </Button>
    </div>
  );
}

export function PendingInvitations({
  invitations,
  activeActionId,
  onCancel,
}: {
  invitations: Invitation[];
  activeActionId: string | null;
  onCancel: (invitationId: string) => void;
}) {
  return (
    <section className="py-6">
      <SectionHeader
        title="Pending invitations"
        description="Invitations stay here until accepted or canceled."
      />
      <div className="mt-4">
        {invitations.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No pending invitations"
            description="Once you invite someone, it will appear here with its assigned role."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            {invitations.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-4 border-b px-4 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                    <RoleBadge role={invite.role} />
                    <Badge
                      variant="outline"
                      className="rounded-lg border-0 bg-amber-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-800"
                    >
                      {invite.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Sent {formatDate(invite.createdAt)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-lg px-3 text-muted-foreground shadow-none hover:bg-muted"
                  onClick={() => onCancel(invite.id)}
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
  );
}

export function MembersList({
  members,
  activeActionId,
  onRoleChange,
  onRequestRemove,
}: {
  members: WorkspaceMember[];
  activeActionId: string | null;
  onRoleChange: (memberId: string, role: MemberRole) => void;
  onRequestRemove: (member: WorkspaceMember) => void;
}) {
  return (
    <section className="py-6">
      <SectionHeader title="Current members" description="Review the team, adjust roles, or remove access." />
      <div className="mt-4">
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members match this view"
            description="Try changing the search term or role filter."
          />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            {members.map((member) => {
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
                        <AvatarCircle name={member.user.name} imageUrl={member.user.imageUrl} />
                      </p>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground sm:text-base">
                            {member.user.name}
                          </p>
                          <RoleBadge role={member.role} />
                        </div>
                        <p className="truncate text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Joined {formatDate(member.createdAt)}</p>
                    <Select
                      value={member.role}
                      onValueChange={(value) => onRoleChange(member.id, value as MemberRole)}
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
                    onClick={() => onRequestRemove(member)}
                    disabled={isOwner || isBusy}
                  >
                    {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export function RemoveMemberDialog({
  member,
  isBusy,
  onClose,
  onConfirm,
}: {
  member: WorkspaceMember | null;
  isBusy: boolean;
  onClose: () => void;
  onConfirm: (member: WorkspaceMember) => void;
}) {
  return (
    <AlertDialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open && !isBusy) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove member</AlertDialogTitle>
          <AlertDialogDescription>
            {member
              ? `Remove ${member.user.name || member.user.email} from this workspace? They will lose access immediately.`
              : "This person will lose access immediately."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={member === null || isBusy}
            onClick={() => {
              if (member) onConfirm(member);
            }}
          >
            {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Remove member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
