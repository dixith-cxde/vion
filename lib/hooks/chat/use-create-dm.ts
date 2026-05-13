import { useMutation } from "@tanstack/react-query";

type CreateDMChannelPayload = {
  workspaceId: string;

  targetUserId: string;
};

async function createDMChannelRequest(payload: CreateDMChannelPayload) {
  const response = await fetch("/api/channels/dm", {
    method: "POST",

    credentials: "include",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to create DM");
  }

  return response.json();
}

export function useCreateDM() {
  return useMutation({
    mutationFn: createDMChannelRequest,
  });
}
