"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import {
  CalendarDays,
  Circle,
  Clock3,
  Hash,
  Loader2,
  User2,
  Zap,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

import {
  type Task,
  type TaskLifecycle,
  type TaskStatus,
} from "@/lib/generated/prisma/client";

type MemberOption = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

type StatusKey = "TODO" | "IN_PROGRESS" | "DONE";
type PriorityKey = "LOW" | "MEDIUM" | "HIGH";

const STATUS_LABEL: Record<StatusKey, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

const STATUS_BG: Record<StatusKey, string> = {
  TODO: "#f4f4f5",
  IN_PROGRESS: "#eff6ff",
  DONE: "#f0fdf4",
};

const STATUS_TEXT: Record<StatusKey, string> = {
  TODO: "#71717a",
  IN_PROGRESS: "#2563eb",
  DONE: "#16a34a",
};

const STATUS_DOT: Record<StatusKey, string> = {
  TODO: "#a1a1aa",
  IN_PROGRESS: "#3b82f6",
  DONE: "#22c55e",
};

const PRIORITY_LABEL: Record<PriorityKey, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const PRIORITY_TEXT: Record<PriorityKey, string> = {
  LOW: "#a1a1aa",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
};

export default function TaskPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const taskId = params.taskId as string;

  const [form, setForm] = useState<Task | null>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const taskRes = await fetch(
        `/api/workspaces/${workspaceId}/tasks/${taskId}`,
      );
      const taskJson = await taskRes.json();
      setForm(taskJson.data);

      const memberRes = await fetch(`/api/workspaces/${workspaceId}/members`);
      const membersJson = await memberRes.json();
      setMembers(membersJson.data ?? []);
    }
    load();
  }, [workspaceId, taskId]);

  async function updateTask(patch?: Partial<Task>) {
    if (!form) return;
    setSaving(true);
    const body = patch ? { ...form, ...patch } : form;
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setForm(json.data);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleField(patch: Partial<Task>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  if (!form) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <Loader2
          style={{ width: 16, height: 16, color: "#a1a1aa" }}
          className="animate-spin"
        />
      </div>
    );
  }

  const statusKey = (form.status as StatusKey) ?? "TODO";
  const priorityKey = (form.priority as PriorityKey) ?? "LOW";
  const assignee = members.find((m) => m.user.id === form.assigneeId);

  return (
    <div style={{ minHeight: "100vh", background: "#f9f9f9" }}>
      <div
        style={{ maxWidth: 640, margin: "0 auto", padding: "72px 32px 120px" }}
      >
        {/* BREADCRUMB */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 28,
          }}
        >
          <span style={{ fontSize: 12, color: "#a1a1aa" }}>Tasks</span>
          <span style={{ fontSize: 12, color: "#d4d4d8" }}>/</span>
          <span
            style={{
              fontSize: 12,
              color: "#71717a",
              fontWeight: 500,
              maxWidth: 300,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {form.title || "Untitled"}
          </span>
        </div>

        {/* TITLE */}
        <input
          value={form.title}
          onChange={(e) => handleField({ title: e.target.value })}
          onBlur={() => updateTask()}
          placeholder="Untitled task"
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1.15,
            background: "transparent",
            border: "none",
            outline: "none",
            padding: 0,
            color: "#111",
            width: "100%",
            marginBottom: 20,
            fontFamily: "inherit",
          }}
        />

        {/* META ROW */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 48,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                background: STATUS_BG[statusKey],
                color: STATUS_TEXT[statusKey],
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: STATUS_DOT[statusKey],
                  flexShrink: 0,
                }}
              />
              {STATUS_LABEL[statusKey]}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: PRIORITY_TEXT[priorityKey],
              }}
            >
              {PRIORITY_LABEL[priorityKey]}
            </span>
            {assignee && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "#71717a",
                }}
              >
                <User2 style={{ width: 12, height: 12 }} />
                {assignee.user.name || assignee.user.email}
              </span>
            )}
          </div>

          <button
            onClick={() => updateTask()}
            disabled={saving}
            style={{
              height: 32,
              padding: "0 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              background: saved ? "#22c55e" : "#111",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              transition: "background 200ms ease",
              flexShrink: 0,
            }}
          >
            {saving ? (
              <Loader2
                style={{ width: 12, height: 12 }}
                className="animate-spin"
              />
            ) : saved ? (
              "Saved"
            ) : (
              "Save"
            )}
          </button>
        </div>

        {/* PROPERTIES */}
        <div style={{ marginBottom: 40 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#c4c4c8",
              marginBottom: 16,
            }}
          >
            Properties
          </p>

          <div style={{ borderTop: "1px solid #f0f0f0" }}>
            {/* STATUS */}
            <PropRow
              icon={<Circle style={{ width: 13, height: 13 }} />}
              label="Status"
            >
              <Select
                value={form.status}
                onValueChange={(value) => {
                  handleField({ status: value as TaskStatus });
                  void updateTask({ status: value as TaskStatus });
                }}
              >
                <SelectTrigger
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    height: "auto",
                    boxShadow: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    color: STATUS_TEXT[statusKey],
                    gap: 4,
                  }}
                  className="focus:ring-0 hover:opacity-70 transition-opacity"
                >
                  {STATUS_LABEL[statusKey]}
                </SelectTrigger>
                <SelectContent
                  style={{ borderRadius: 12, padding: 6 }}
                  className="shadow-lg border border-zinc-100"
                >
                  {(["TODO", "IN_PROGRESS", "DONE"] as StatusKey[]).map(
                    (val) => (
                      <SelectItem
                        key={val}
                        value={val}
                        style={{
                          borderRadius: 8,
                          padding: "8px 12px",
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: STATUS_DOT[val],
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{ color: STATUS_TEXT[val], fontWeight: 500 }}
                          >
                            {STATUS_LABEL[val]}
                          </span>
                        </span>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </PropRow>

            {/* ASSIGNEE */}
            <PropRow
              icon={<User2 style={{ width: 13, height: 13 }} />}
              label="Assignee"
            >
              <Select
                value={form.assigneeId ?? "__none__"}
                onValueChange={(value) => {
                  const next = value === "__none__" ? null : value;
                  handleField({ assigneeId: next });
                  void updateTask({ assigneeId: next });
                }}
              >
                <SelectTrigger
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    height: "auto",
                    boxShadow: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    color: assignee ? "#111" : "#a1a1aa",
                    gap: 4,
                  }}
                  className="focus:ring-0 hover:opacity-70 transition-opacity"
                >
                  {assignee
                    ? assignee.user.name || assignee.user.email
                    : "Unassigned"}
                </SelectTrigger>
                <SelectContent
                  style={{ borderRadius: 12, padding: 6 }}
                  className="shadow-lg border border-zinc-100"
                >
                  <SelectItem
                    value="__none__"
                    style={{
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 13,
                      cursor: "pointer",
                      color: "#a1a1aa",
                    }}
                  >
                    Unassigned
                  </SelectItem>
                  {members.map((m) => (
                    <SelectItem
                      key={m.user.id}
                      value={m.user.id}
                      style={{
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {m.user.name || m.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropRow>

            {/* PRIORITY */}
            <PropRow
              icon={<Zap style={{ width: 13, height: 13 }} />}
              label="Priority"
            >
              <Select
                value={form.priority ?? "LOW"}
                onValueChange={(value) => {
                  handleField({ priority: value });
                  void updateTask({ priority: value });
                }}
              >
                <SelectTrigger
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    height: "auto",
                    boxShadow: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    color: PRIORITY_TEXT[priorityKey],
                    gap: 4,
                  }}
                  className="focus:ring-0 hover:opacity-70 transition-opacity"
                >
                  {PRIORITY_LABEL[priorityKey]}
                </SelectTrigger>
                <SelectContent
                  style={{ borderRadius: 12, padding: 6 }}
                  className="shadow-lg border border-zinc-100"
                >
                  {(["LOW", "MEDIUM", "HIGH"] as PriorityKey[]).map((val) => (
                    <SelectItem
                      key={val}
                      value={val}
                      style={{
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{ color: PRIORITY_TEXT[val], fontWeight: 500 }}
                      >
                        {PRIORITY_LABEL[val]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropRow>

            {/* CREATED */}
            <PropRow
              icon={<CalendarDays style={{ width: 13, height: 13 }} />}
              label="Created"
            >
              <span style={{ fontSize: 13, color: "#333" }}>
                {new Date(form.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </PropRow>

            {/* UPDATED */}
            <PropRow
              icon={<Clock3 style={{ width: 13, height: 13 }} />}
              label="Updated"
            >
              <span style={{ fontSize: 13, color: "#333" }}>
                {new Date(form.updatedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </PropRow>

            {/* ID */}
            <PropRow
              icon={<Hash style={{ width: 13, height: 13 }} />}
              label="ID"
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#a1a1aa",
                }}
              >
                {form.id}
              </span>
            </PropRow>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ borderTop: "1px solid #ececec", marginBottom: 40 }} />

        {/* DESCRIPTION */}
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#c4c4c8",
              marginBottom: 16,
            }}
          >
            Description
          </p>
          <textarea
            value={form.description ?? ""}
            onChange={(e) => handleField({ description: e.target.value })}
            onBlur={() => updateTask()}
            placeholder="Write task details, acceptance criteria, or context..."
            style={{
              width: "100%",
              minHeight: 260,
              background: "#fff",
              border: "1px solid #ececec",
              borderRadius: 12,
              padding: "16px 18px",
              fontSize: 13,
              lineHeight: 1.8,
              color: "#333",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              transition: "border-color 150ms ease",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#d4d4d8";
            }}
            onBlurCapture={(e) => {
              e.target.style.borderColor = "#ececec";
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PropRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "11px 0",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: 120,
          flexShrink: 0,
          color: "#c4c4c8",
        }}
      >
        {icon}
        <span style={{ fontSize: 13, color: "#a1a1aa" }}>{label}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
