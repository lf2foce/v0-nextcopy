import { type NextRequest, NextResponse } from "next/server"
import { resetDatabase } from "@/lib/reset-db"
import { seedDatabase } from "@/lib/seed-db"

// This is a simple admin token check - in production, use a more secure method
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-secret-token"

export async function POST(request: NextRequest) {
  try {
    // Check for admin token
    const authHeader = request.headers.get("Authorization")
    const token = authHeader?.split("Bearer ")[1]

    if (!token) {
      return NextResponse.json({ success: false, error: "No authorization token provided" }, { status: 401 })
    }

    if (token !== ADMIN_TOKEN) {
      return NextResponse.json({ success: false, error: "Invalid authorization token" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { action } = body

    if (action === "reset") {
      // Reset the entire database (dangerous!)
      const result = await resetDatabase()
      return NextResponse.json(result)
    } else if (action === "seed") {
      // Only seed the database
      const result = await seedDatabase()
      return NextResponse.json(result)
    } else {
      return NextResponse.json({ success: false, error: "Invalid action. Use 'reset' or 'seed'." }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in admin/db API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
