"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function CreateWorkspacePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Workspace name required",
        description: "Enter a name before creating the workspace.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({ name }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        toast({
          title: "Workspace creation failed",
          description: "The workspace could not be created.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const workspace = await res.json();

      router.push(`/workspaces/${workspace.id}`);
    } catch {
      toast({
        title: "Workspace creation failed",
        description: "Something went wrong while creating the workspace.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Workspace</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Workspace Name</Label>
              <Input
                placeholder="e.g. VION Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
