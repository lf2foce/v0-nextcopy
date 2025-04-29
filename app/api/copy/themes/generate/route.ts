import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json()

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 })
    }

    const fastApiUrl = process.env.FASTAPI_URL
    if (!fastApiUrl) {
      return NextResponse.json(
        { success: false, error: "FASTAPI_URL environment variable is not set" },
        { status: 500 },
      )
    }
    const response = await fetch(`${fastApiUrl}/themes/campaigns/${campaignId}/generate_themes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Add any additional body parameters if needed
      // body: JSON.stringify({ additionalData: "value" }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("External API error:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: `External API error: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("API response data structure:", Object.keys(data))
    console.log("First theme content_plan check:", data[0]?.content_plan ? "Has content_plan" : "No content_plan")
    if (data[0]?.content_plan) {
      console.log("Content plan structure:", Object.keys(data[0].content_plan))
      console.log("Content plan items count:", data[0].content_plan.items?.length || 0)
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error in theme generation API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate themes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
