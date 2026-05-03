export const ENTITY_TYPE = {
  TASK: "TASK",
  DOCUMENT: "DOCUMENT",
  MESSAGE: "MESSAGE",
  COMMIT: "COMMIT",
  CHANNEL: "CHANNEL",
  USER: "USER",
} as const;

export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

export const ENTITY_COLOR: Record<
  EntityType,
  { bg: string; text: string; border: string }
> = {
  TASK: {
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-200",
  },
  DOCUMENT: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
  MESSAGE: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-200",
  },
  COMMIT: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-200",
  },
  CHANNEL: {
    bg: "bg-rose-50",
    text: "text-rose-600",
    border: "border-rose-200",
  },
  USER: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    border: "border-slate-200",
  },
};

export const ENTITY_LABEL: Record<EntityType, string> = {
  TASK: "Task",
  DOCUMENT: "Document",
  MESSAGE: "Message",
  COMMIT: "Commit",
  CHANNEL: "Channel",
  USER: "User",
};

// ---------------------------------------------------------------------------
// TASK STATUS TOKENS
// ---------------------------------------------------------------------------

export const TASK_STATUS = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  BLOCKED: "BLOCKED",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export const TASK_STATUS_COLOR: Record<
  TaskStatus,
  { bg: string; text: string; dot: string }
> = {
  TODO: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
  IN_PROGRESS: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    dot: "bg-amber-400",
  },
  DONE: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    dot: "bg-emerald-400",
  },
  BLOCKED: { bg: "bg-red-50", text: "text-red-500", dot: "bg-red-400" },
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
  BLOCKED: "Blocked",
};

// ---------------------------------------------------------------------------
// DOCUMENT STATUS TOKENS (matches reference image: Incoming / Ongoing / Past)
// ---------------------------------------------------------------------------

export const DOC_STATUS = {
  INCOMING: "INCOMING",
  ONGOING: "ONGOING",
  PAST: "PAST",
} as const;

export type DocStatus = (typeof DOC_STATUS)[keyof typeof DOC_STATUS];

export const DOC_STATUS_COLOR: Record<DocStatus, { bg: string; text: string }> =
  {
    INCOMING: { bg: "bg-emerald-100", text: "text-emerald-700" },
    ONGOING: { bg: "bg-sky-100", text: "text-sky-700" },
    PAST: { bg: "bg-slate-100", text: "text-slate-500" },
  };

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  INCOMING: "Incoming",
  ONGOING: "Ongoing",
  PAST: "Past",
};

// ---------------------------------------------------------------------------
// NOTIFICATION TYPE TOKENS
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPE = {
  MENTIONED: "MENTIONED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  INVITE_RECEIVED: "INVITE_RECEIVED",
  COMMIT_LINKED: "COMMIT_LINKED",
  DOCUMENT_UPDATED: "DOCUMENT_UPDATED",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_TYPE_COLOR: Record<
  NotificationType,
  { bg: string; text: string }
> = {
  MENTIONED: { bg: "bg-sky-100", text: "text-sky-700" },
  TASK_ASSIGNED: { bg: "bg-violet-100", text: "text-violet-700" },
  INVITE_RECEIVED: { bg: "bg-emerald-100", text: "text-emerald-700" },
  COMMIT_LINKED: { bg: "bg-amber-100", text: "text-amber-700" },
  DOCUMENT_UPDATED: { bg: "bg-slate-100", text: "text-slate-600" },
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  MENTIONED: "Mentioned",
  TASK_ASSIGNED: "Task Assigned",
  INVITE_RECEIVED: "Invite",
  COMMIT_LINKED: "Commit Linked",
  DOCUMENT_UPDATED: "Doc Updated",
};

// ---------------------------------------------------------------------------
// RELATIONSHIP TYPE TOKENS
// ---------------------------------------------------------------------------

export const RELATIONSHIP_TYPE = {
  EXPLAINS: "EXPLAINS",
  RESOLVES: "RESOLVES",
  REFERENCES: "REFERENCES",
  CONVERTED_TO: "CONVERTED_TO",
  BLOCKS: "BLOCKS",
} as const;

export type RelationshipType =
  (typeof RELATIONSHIP_TYPE)[keyof typeof RELATIONSHIP_TYPE];

export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  EXPLAINS: "Explains",
  RESOLVES: "Resolves",
  REFERENCES: "References",
  CONVERTED_TO: "Converted To",
  BLOCKS: "Blocks",
};

// ---------------------------------------------------------------------------
// TIME FILTER TOKENS (for list UIs like Documents / Tasks)
// ---------------------------------------------------------------------------

export const TIME_FILTER = {
  ALL: "ALL",
  TODAY: "TODAY",
  TOMORROW: "TOMORROW",
  YESTERDAY: "YESTERDAY",
  THIS_WEEK: "THIS_WEEK",
} as const;

export type TimeFilter = (typeof TIME_FILTER)[keyof typeof TIME_FILTER];

export const TIME_FILTER_COLOR: Record<
  TimeFilter,
  { bg: string; text: string }
> = {
  ALL: { bg: "bg-slate-100", text: "text-slate-500" },
  TODAY: { bg: "bg-rose-100", text: "text-rose-600" },
  TOMORROW: { bg: "bg-amber-100", text: "text-amber-600" },
  YESTERDAY: { bg: "bg-slate-100", text: "text-slate-500" },
  THIS_WEEK: { bg: "bg-violet-100", text: "text-violet-600" },
};

export const TIME_FILTER_LABEL: Record<TimeFilter, string> = {
  ALL: "All",
  TODAY: "Today",
  TOMORROW: "Tomorrow",
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week",
};
