"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useWorkspace } from "./_components/context/workspace-context-provider";
import { useRouter } from "next/navigation";

export default function Page() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;
  const router = useRouter();

  useEffect(() => {
    if (workspaceId) router.push(`/workspaces/${workspaceId}`);
  }, [workspaceId]);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <p className="w-full min-h-screen flex justify-center items-center">
        <span>
          Please navigate to{" "}
          <Link href={`/workspaces/${workspaceId}`} className="underline">
            Dashboard
          </Link>
        </span>
      </p>
    </div>
  );
}
