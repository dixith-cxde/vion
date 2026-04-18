import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/services/user.service";

export async function requireUser() {
  const user = await getOrCreateUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
