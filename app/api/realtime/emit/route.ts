import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Realtime emit endpoint is not implemented.",
    },
    { status: 501 }
  );
}
