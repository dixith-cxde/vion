import { GithubRepositoryPage } from "@/app/_components/github/github-repository-page";

type GithubRepositoryRouteProps = {
  params: Promise<{
    workspaceId: string;
    repository: string[];
  }>;
};

export default async function WorkspaceGithubRepositoryPage({
  params,
}: GithubRepositoryRouteProps) {
  const { workspaceId, repository } = await params;

  return (
    <GithubRepositoryPage
      workspaceId={workspaceId}
      repositoryFullName={repository.join("/")}
    />
  );
}
