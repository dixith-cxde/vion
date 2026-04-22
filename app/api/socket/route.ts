import { NextResponse } from "next/server";
import { initSocket } from "@/lib/socket";
import { createServer } from "http";

let initialized = false;

export async function GET() {
  if (!initialized) {
    const httpServer = createServer();
    initSocket(httpServer);
    initialized = true;

    console.log("Socket server initialized");
  }

  return NextResponse.json({ success: true });
}
