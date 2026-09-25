export type DashboardDocument = {
  id: string;
  title: string;
  updatedAt: string;
};

export type DashboardTask = {
  id: string;
  title: string;
  status: string;
};

export type DashboardActivityItem = {
  id: string;
  sourceLabel: string;
  targetLabel: string;
  relationshipType: string;
};

export type DashboardData = {
  documents: DashboardDocument[];
  tasks: DashboardTask[];
  activity: DashboardActivityItem[];
};

export type DashboardSummary = {
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  latestDoc: DashboardDocument | null;
  completionRate: number;
};
