import { checkConnectionStatus } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const status = await checkConnectionStatus()

  return NextResponse.json(status)
}
