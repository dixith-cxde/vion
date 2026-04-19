"use client";

import { useEffect, useState, useCallback } from "react";
import { Task, TaskStatus, TaskLifecycle } from "@/lib/generated/prisma/client";

// ---------- DOMAIN RULES ----------
function canMoveTask(task: Task) {
  return task.lifecycle === "ACTIVE";
}

// ---------- NORMALIZER ----------
function normalizeTasks(tasks: Task[]): Task[] {
  return tasks.map((t) => ({
    ...t,
    status: t.status ?? "TODO",
    lifecycle: t.lifecycle ?? "ACTIVE",
  }));
}

export function useTasks(workspaceId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------- LOAD ----------
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/tasks`);
        const json = await res.json();

        if (!ignore) {
          setTasks(normalizeTasks(json.data ?? []));
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [workspaceId]);

  // ---------- CREATE ----------
  const createTask = useCallback(
    async (title: string, status: TaskStatus = "TODO") => {
      if (!title) return;

      const tempId = `temp-${Date.now()}`;

      const optimisticTask: Task = {
        id: tempId,
        title,
        description: null,
        status,
        lifecycle: "ACTIVE",
        priority: "MEDIUM",
        dueDate: null,
        estimatedAt: null,
        type: "TASK",
        workspaceId,
        assigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // optimistic update
      setTasks((prev) => [...prev, optimisticTask]);

      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
          method: "POST",
          body: JSON.stringify({
            title,
            status,
            lifecycle: "ACTIVE",
          }),
        });

        const json = await res.json();

        // replace temp with real
        setTasks((prev) => prev.map((t) => (t.id === tempId ? json.data : t)));
      } catch {
        // rollback
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      }
    },
    [workspaceId],
  );

  // ---------- UPDATE STATUS ----------
  const updateStatus = useCallback(
    async (taskId: string, nextStatus: TaskStatus) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // 🚫 block invalid transitions
      if (!canMoveTask(task)) return;

      const prevTasks = tasks;

      // optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
      );

      try {
        await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        });
      } catch {
        // rollback
        setTasks(prevTasks);
      }
    },
    [tasks, workspaceId],
  );

  return {
    tasks,
    loading,
    createTask,
    updateStatus,
  };
}
