"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";

export default function Page() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn) {
      router.replace(`/workspaces`);
    }
  }, [router, isSignedIn, isLoaded]);

  if (!isLoaded) {
    return (
      <div className="w-full min-h-screen flex justify-center items-center">
        <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn redirectUrl="/workspaces" />;
  }

  return (
    <div className="w-full min-h-screen flex justify-center items-center">
      <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full" />
    </div>
  );
}
