"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Task, TaskStatus } from "@/lib/generated/prisma/client";
import { canMoveTask } from "@/lib/tasks/task-rules";

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
  const [error, setError] = useState<string | null>(null);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("Failed to load tasks");
        }

        const json = await res.json();

        setTasks(normalizeTasks(json.data ?? []));
        setLoading(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load tasks");
        setLoading(false);
      }
    }

    void load();

    return () => {
      controller.abort();
    };
  }, [workspaceId]);

  const createTask = useCallback(
    async (
      title: string,
      status: TaskStatus = "TODO",
    ): Promise<string | null> => {
      if (!title) return null;

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
        createdById: null,
        assigneeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // optimistic update
      setTasks((prev) => [...prev, optimisticTask]);

      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            status,
            lifecycle: "ACTIVE",
          }),
        });
        if (!res.ok) {
          throw new Error("Failed to create task");
        }

        const json = await res.json();
        const nextTask = normalizeTasks([json.data])[0];

        // replace temp with real
        setTasks((prev) => prev.map((t) => (t.id === tempId ? nextTask : t)));
        return nextTask.id;
      } catch {
        // rollback
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        return null;
      }
    },
    [workspaceId],
  );

  const updateStatus = useCallback(
    async (taskId: string, nextStatus: TaskStatus) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      if (!task) return;
      if (task.status === nextStatus) return;

      if (!canMoveTask(task)) return;

      const previousStatus = task.status;

      // optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
      );

      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/tasks/${taskId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: nextStatus }),
          },
        );
        if (!res.ok) {
          throw new Error("Failed to update task status");
        }

        const json = await res.json();
        const updatedTask = normalizeTasks([json.data])[0];

        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t)),
        );
      } catch {
        // rollback
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: previousStatus } : t,
          ),
        );
      }
    },
    [workspaceId],
  );

  return {
    tasks,
    loading,
    error,
    createTask,
    updateStatus,
  };
}
