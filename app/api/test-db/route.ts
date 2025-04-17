import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { campaigns, contentPosts } from "@/lib/schema"

export async function GET() {
  try {
    // Try to query the database
    const result = await db.select().from(campaigns)

    // Also check the content_posts table
    const postsResult = await db.select().from(contentPosts).limit(5)

    // Map the results to the expected format for the UI
    const mappedCampaigns = result.map((campaign) => ({
      ...campaign,
      name: campaign.title, // Map title to name
      target: campaign.targetCustomer, // Map targetCustomer to target
      platform: "instagram", // Default value for backward compatibility
    }))

    const mappedPosts = postsResult.map((post) => ({
      ...post,
      image: post.imageUrl, // Map imageUrl to image
      isApproved: post.status === "approved" || post.status === "scheduled" || post.status === "posted",
      isScheduled: post.status === "scheduled" || post.status === "posted",
    }))

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      data: {
        campaigns: mappedCampaigns,
        contentPosts: mappedPosts,
      },
    })
  } catch (error) {
    console.error("Database connection error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
