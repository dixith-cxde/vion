"use client";

import type * as Y from "yjs";

export type EditorContext = {
  entityType: "DOCUMENT" | "TASK";
  entityId: string;
  workspaceId: string;
};

export type MetaValue = string | number | boolean | null;

export type CollaborationUser = {
  clientId: number;
  id: string;
  name: string;
  color: string;
  imageUrl: string | null;
};

export function getRoomName(entityType: EditorContext["entityType"], entityId: string) {
  return `${entityType === "DOCUMENT" ? "doc" : "task"}-${entityId}`;
}

export function getDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined
) {
  if (fullName?.trim()) {
    return fullName.trim();
  }

  if (email?.trim()) {
    return email.split("@")[0] ?? email.trim();
  }

  return "User";
}

export function getColorSeed(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }

  return `hsl(${Math.abs(hash) % 360} 72% 52%)`;
}

export function toMetaEntries(
  values: Record<string, MetaValue | undefined>
): Array<[string, MetaValue]> {
  return Object.entries(values).flatMap(([k, v]) => (v === undefined ? [] : [[k, v]]));
}

export function readMetaMap<T extends Record<string, MetaValue>>(
  map: Y.Map<MetaValue>,
  fallback: T
): T {
  const next = { ...fallback } as T;

  for (const [k, v] of map.entries()) {
    (next as Record<string, MetaValue>)[k] = v;
  }

  return next;
}

export function areUsersEqual(a: CollaborationUser[], b: CollaborationUser[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((u, i) => {
    const v = b[i];

    return (
      v && u.clientId === v.clientId && u.id === v.id && u.name === v.name && u.color === v.color
    );
  });
}

export function dedupeUsers(users: CollaborationUser[]): CollaborationUser[] {
  const map = new Map<string, CollaborationUser>();

  for (const user of users) {
    const existing = map.get(user.id);

    if (!existing) {
      map.set(user.id, user);
    } else {
      map.set(user.id, {
        ...existing,
        ...user,
        imageUrl: user.imageUrl ?? existing.imageUrl,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
