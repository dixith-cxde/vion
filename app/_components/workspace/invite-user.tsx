"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export function InviteUser({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (data.success) {
        setEmail("");
        toast({
          title: "Invitation sent",
          description: `An invite was sent to ${email}.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Invite failed",
          description: data.message || "Something went wrong.",
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Invite failed",
        description: "Something went wrong.",
      });
    }

    setLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Invite Members</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MEMBER">Member</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={handleInvite} disabled={loading}>
          {loading ? "Inviting..." : "Invite"}
        </Button>
      </CardContent>
    </Card>
  );
}
