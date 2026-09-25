import { deleteTask, getTask, patchTask } from "./handlers";

type TaskRouteContext = RouteContext<"/api/workspaces/[workspaceId]/tasks/[taskId]">;

export async function GET(req: Request, context: TaskRouteContext) {
  return getTask(req, context);
}

export async function PATCH(req: Request, context: TaskRouteContext) {
  return patchTask(req, context);
}

export async function DELETE(req: Request, context: TaskRouteContext) {
  return deleteTask(req, context);
}
