import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { campaigns } from "@/lib/schema"

export async function GET() {
  try {
    // Get all campaigns
    const allCampaigns = await db.select().from(campaigns)

    return NextResponse.json({
      success: true,
      count: allCampaigns.length,
      campaigns: allCampaigns.map((c) => ({
        id: c.id,
        name: c.title,
        currentStep: c.currentStep,
        status: c.currentStep === 7 ? "scheduled" : "in-progress",
      })),
    })
  } catch (error) {
    console.error("Error fetching campaigns:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch campaigns",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
