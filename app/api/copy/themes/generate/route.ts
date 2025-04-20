// filepath: /Users/macbook/Desktop/v0-nextcopy/app/api/copy/themes/generate/route.ts
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json()

    if (!campaignId) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 })
    }

    console.log(`Generating themes for campaign ID: ${campaignId}`);

    // Call the external API
    const fastApiUrl = process.env.FASTAPI_URL || "http://nextcopy-backend-test.onrender.com"
    console.log(`Connecting to FastAPI backend at: ${fastApiUrl}`);
    
    try {
      // Use a longer timeout for Render services which can have cold starts
      // The timeout is set to 90 seconds which should accommodate most cold starts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
      
      console.log(`Making request to: ${fastApiUrl}/themes/campaigns/${campaignId}/generate_themes`);
      const response = await fetch(`${fastApiUrl}/themes/campaigns/${campaignId}/generate_themes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Use our custom abort controller
        signal: controller.signal,
        // Add cache: 'no-store' to bypass cache issues
        cache: 'no-store',
      })
      
      // Clear the timeout as we got a response
      clearTimeout(timeoutId);

      console.log(`API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("External API error:", errorText);
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
      return NextResponse.json(data)
    } catch (error) {
      console.error("Fetch error when connecting to FastAPI:", error)

      // Special handling for timeout errors
      if (error.name === 'AbortError' || error.code === 23) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to connect to the themes backend service due to timeout. The service might be in cold start mode or experiencing high load. Please try again.",
          },
          { status: 503 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to the themes backend service",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 503 },
      )
    }
  } catch (error) {
    console.error("Error in themes/generate API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
