import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { themeId: string } }) {
  try {
    const themeId = params.themeId

    if (!themeId) {
      return NextResponse.json({ success: false, error: "Theme ID is required" }, { status: 400 })
    }

    console.log(`API route: Checking status for theme ${themeId}`)

    // Call the external API
    try {
      const fastApiUrl = process.env.FASTAPI_URL
      if (!fastApiUrl) {
        return NextResponse.json(
          { success: false, error: "FASTAPI_URL environment variable is not set" },
          { status: 500 },
        )
      }
      const response = await fetch(`${fastApiUrl}/themes/${themeId}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })

      // Log the response status
      console.log(`External API response status: ${response.status}`)

      // If response is not ok, get the error text
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`External API error (${response.status}):`, errorText)

        return NextResponse.json(
          {
            success: false,
            error: `External API error: ${response.status} ${response.statusText}`,
            details: errorText,
          },
          { status: response.status },
        )
      }

      // Parse the successful response
      const data = await response.json()
      console.log("External API success response:", data)
      return NextResponse.json({ success: true, data })
    } catch (fetchError) {
      console.error("Fetch error when calling external API:", fetchError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to connect to external API",
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
        },
        { status: 503 },
      )
    }
  } catch (error) {
    console.error("Error in theme status API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check theme status",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
