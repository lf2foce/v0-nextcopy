// Create a mock API endpoint for theme selection
// This is a new file

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { themeId } = await request.json()

    if (!themeId) {
      return NextResponse.json({ success: false, error: "Theme ID is required" }, { status: 400 })
    }

    console.log(`Mock API route: Selecting theme ${themeId}`)

    // Simulate a successful response
    return NextResponse.json({
      success: true,
      data: {
        id: themeId,
        status: "selected",
        message: "Theme selected successfully (mock response)",
      },
    })
  } catch (error) {
    console.error("Error in mock theme selection API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process mock theme selection",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
