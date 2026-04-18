import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/services/user.service";

export async function GET() {
  const user = await getOrCreateUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(user);
}
