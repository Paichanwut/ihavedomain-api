import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Server is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3000,
  });
}
