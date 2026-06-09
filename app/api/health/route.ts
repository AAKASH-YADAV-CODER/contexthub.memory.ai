import { NextResponse } from "next/server";

export const GET = async () => {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString().split("T")[0],
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  });
};
