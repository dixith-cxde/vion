"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type DashboardData = {
  documents: {
    id: string;
    title: string;
    updatedAt: string;
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
  }[];
  activity: {
    id: string;
    sourceLabel: string;
    targetLabel: string;
    relationshipType: string;
  }[];
};

export default function WorkspaceDashboard() {
  const { activeWorkspace } = useWorkspace();
  const [data, setData] = useState<DashboardData | null>(null);

  const getRecentData = async () => {
    if (!activeWorkspace) return;

    const response = await fetch(
      `/api/workspaces/${activeWorkspace.id}/dashboard`,
    );
    const x = await response.json();
    console.log(x);
  };

  useEffect(() => {
    getRecentData();
  }, [activeWorkspace]);

  if (!data) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* DOCUMENTS */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.documents.map((doc) => (
            <div key={doc.id} className="text-sm">
              {doc.title}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* TASKS */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.tasks.map((task) => (
            <div key={task.id} className="text-sm">
              {task.title} ({task.status})
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ACTIVITY */}
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.activity.map((item) => (
            <div key={item.id} className="text-sm">
              {item.sourceLabel} → {item.targetLabel}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
