"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
};

export default function TasksPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTasks() {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks`);
    const data = await res.json();

    setTasks(data.data);
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/tasks`);
        const json = await res.json();

        const data = Array.isArray(json) ? json : json.data || [];

        setTasks(data);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [workspaceId]);

  async function createTask(title: string, status: Task["status"]) {
    if (!title) return;

    await fetch(`/api/workspaces/${workspaceId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ title, status }),
    });

    fetchTasks();
  }

  async function updateStatus(task: Task) {
    const next =
      task.status === "TODO"
        ? "IN_PROGRESS"
        : task.status === "IN_PROGRESS"
          ? "DONE"
          : "TODO";

    await fetch(`/api/workspaces/${workspaceId}/tasks/${task.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });

    fetchTasks();
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 h-full flex gap-4">
      <Column
        title="TODO"
        status="TODO"
        tasks={tasks}
        onCreate={createTask}
        onUpdate={updateStatus}
      />
      <Column
        title="IN PROGRESS"
        status="IN_PROGRESS"
        tasks={tasks}
        onCreate={createTask}
        onUpdate={updateStatus}
      />
      <Column
        title="DONE"
        status="DONE"
        tasks={tasks}
        onCreate={createTask}
        onUpdate={updateStatus}
      />
    </div>
  );
}

function Column({
  title,
  status,
  tasks,
  onCreate,
  onUpdate,
}: {
  title: string;
  status: Task["status"];
  tasks: Task[];
  onCreate: (title: string, status: Task["status"]) => void;
  onUpdate: (task: Task) => void;
}) {
  const [input, setInput] = useState("");

  const filtered = tasks.filter((t) => t.status === status);

  return (
    <div className="flex-1 bg-muted/40 p-4 rounded-xl flex flex-col">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>

      <div className="space-y-2 flex-1">
        {filtered.map((task) => (
          <Card
            key={task.id}
            className="cursor-pointer hover:bg-muted"
            onClick={() => onUpdate(task)}
          >
            <CardContent className="p-3 text-sm">{task.title}</CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="New task..."
        />
        <button
          className="text-xs px-3 bg-primary text-white rounded-md"
          onClick={() => {
            onCreate(input, status);
            setInput("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
