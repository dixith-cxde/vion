import SettingsClient from "@/app/_components/workspace/settings-client";

export default async function Page(
  props: PageProps<"/workspaces/[workspaceId]/settings/members">,
) {
  const { workspaceId } = await props.params;

  return <SettingsClient workspaceId={workspaceId} />;
}
