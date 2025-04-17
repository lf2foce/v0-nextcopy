import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { campaigns, themes, contentPosts } from "@/lib/schema"
import { sql } from "drizzle-orm"

// This is a simple admin token check - in production, use a more secure method
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin-secret-token"

export async function GET(request: NextRequest) {
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

    // Get counts from database
    const campaignResult = await db.select({ count: sql`count(*)` }).from(campaigns)
    const campaignCount = Number(campaignResult[0].count)

    const themeResult = await db.select({ count: sql`count(*)` }).from(themes)
    const themeCount = Number(themeResult[0].count)

    const postResult = await db.select({ count: sql`count(*)` }).from(contentPosts)
    const postCount = Number(postResult[0].count)

    // Get database info
    const dbInfo = await db.execute(sql`SELECT version(), current_database(), current_user`)

    return NextResponse.json({
      success: true,
      stats: {
        campaigns: campaignCount,
        themes: themeCount,
        posts: postCount,
        dbInfo: dbInfo.rows?.[0] || {},
      },
    })
  } catch (error) {
    console.error("Error fetching database stats:", error)
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
