import { Activity, CheckCircle2, FolderKanban, Gauge } from "lucide-react";

import { StatCard } from "./stat-card";

interface TasksStatsProps {
  tasks: number;
  doneCount: number;
  inProgressCount: number;
  completionRate: number;
}

export function TasksStats({ tasks, doneCount, inProgressCount, completionRate }: TasksStatsProps) {
  const statCards = [
    {
      label: "Tasks",
      value: tasks,
      accent: "violet",
      icon: FolderKanban,
    },

    {
      label: "In Progress",
      value: inProgressCount,
      accent: "amber",
      icon: Activity,
    },

    {
      label: "Completed",
      value: doneCount,
      accent: "emerald",
      icon: CheckCircle2,
    },

    {
      label: "Completion",
      value: `${completionRate}%`,
      accent: "cyan",
      icon: Gauge,
    },
  ] as const;

  return (
    <div className="mb-6 grid select-none grid-cols-2 gap-3 md:grid-cols-4">
      {statCards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          accent={card.accent}
          icon={card.icon}
        />
      ))}
    </div>
  );
}
