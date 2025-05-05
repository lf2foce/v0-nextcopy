import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { campaignInput } = await request.json()
    console.log("📥 Received request for system prompt generation:", campaignInput)
    if (!campaignInput?.id || !campaignInput?.title || !campaignInput?.description) {
      return NextResponse.json(
        { success: false, error: "Missing required campaign fields", details: campaignInput },
        { status: 400 }
      )
    }

    const apiUrl = `${process.env.FASTAPI_URL}/campaigns/gen_campaign_system`
    console.log("🌐 Calling FastAPI endpoint:", apiUrl)

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignInput }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { success: false, error: `FastAPI error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const result = await response.json()
    console.log("✅ Response from FastAPI:", result)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("❌ Error generating system prompt:", error)
    return NextResponse.json(
      { success: false, error: "Unexpected error", details: String(error) },
      { status: 500 }
    )
  }
}
