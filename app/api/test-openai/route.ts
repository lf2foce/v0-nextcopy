import { OpenAI } from "openai"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.",
        },
        { status: 500 },
      )
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    try {
      // Test the API key with a simple request
      const models = await openai.models.list()

      return NextResponse.json({
        success: true,
        message: "OpenAI API key is valid and working correctly.",
        models: models.data.slice(0, 5).map((model) => model.id), // Just return first 5 model IDs
      })
    } catch (openaiError: any) {
      console.error("OpenAI API error:", openaiError.message)
      return NextResponse.json(
        {
          success: false,
          error: `OpenAI API error: ${openaiError.message}`,
          details: openaiError.response?.data,
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("Error testing OpenAI API:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to test OpenAI API: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
