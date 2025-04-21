import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json()

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 })
    }

    // Call the external API
    const response = await fetch(`https://techlocal-copy.onrender.com/themes/campaigns/${campaignId}/generate_themes`, {
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
