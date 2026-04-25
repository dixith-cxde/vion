import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error:
        "Socket route is not used in this app. Start the dedicated websocket process instead.",
    },
    { status: 410 },
  );
}
