import { NextResponse } from "next/server"
import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

export async function POST(request: Request) {
  console.log("🚀 System prompt generation API called with Grok-3-Fast model")

  // Check if XAI_API_KEY is available
  if (!process.env.XAI_API_KEY) {
    console.error("❌ Missing XAI_API_KEY environment variable")
    return NextResponse.json(
      {
        success: false,
        error: "Missing XAI_API_KEY environment variable",
      },
      { status: 500 },
    )
  }

  try {
    // Parse request body
    const { campaignData } = await request.json()

    console.log("📋 Campaign data received:", campaignData.title)

    if (!campaignData || !campaignData.title || !campaignData.description) {
      console.error("❌ Missing required campaign data")
      return NextResponse.json(
        {
          success: false,
          error: "Missing required campaign data",
        },
        { status: 400 },
      )
    }

    // Build the system prompt
    const systemPrompt = `You are an expert marketing strategist specializing in creating detailed campaign frameworks.`

    // Build the user prompt
    const userPrompt = `
Based on the following campaign information:
- Title: ${campaignData.title}
- Description: ${campaignData.description}
- Target Customer: ${campaignData.targetCustomer || "Not specified"}
- Customer Insight: ${campaignData.insight || "Not specified"}

Create a comprehensive marketing campaign strategy in JSON format with the following structure:

{
  "mindset": "Core thinking style for the campaign",
  "title": "${campaignData.title}",
  "description": "${campaignData.description}",
  "targetCustomer": "${campaignData.targetCustomer || "Not specified"}",
  "insight": "${campaignData.insight || "Not specified"}",
  "brandPersona": "Brand personality and character",
  "campaignObjective": "One of: Connect, Educate, Inspire, Promote, Entertain, Engage",
  "purposeGoal": "One of: Inspire, Convert, Teach, Make Laugh",
  "topicStyle": "One of: Motivational, Educational, Storytelling, Product-Driven, Emotional, How-To",
  "brandVoice": "Communication style of the brand",
  "toneWriting": "Tone appropriate for the campaign",
  "keyMessages": [
    "3-5 core messages"
  ],
  "painPoints": [
    "2-3 main customer pain points"
  ],
  "bigKeywords": [
    "Key phrases to emphasize"
  ],
  "platforms": [
    "Suitable platforms (e.g., Facebook, Instagram, LinkedIn)"
  ],
  "callsToAction": [
    "2-3 strong calls to action"
  ],
  "imageMood": "Suggested visual style",
  "confidenceScore": 0-100
}

IMPORTANT INSTRUCTIONS:
1. Return ONLY valid JSON with no markdown formatting, code blocks, or additional text
2. Be specific and detailed in all fields
3. Ensure all array fields have at least 2 items
4. Make recommendations that are realistic and actionable
5. Tailor all suggestions to the specific campaign details provided
`

    console.log("🔄 Calling Grok-3-Fast model...")

    const { text } = await generateText({
      model: xai("grok-3-fast"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    })

    console.log("✅ Grok response received")

    let cleanedText = text.trim()

    // Handle potential markdown code blocks in the response
    if (cleanedText.startsWith("```json")) {
      console.log("🧹 Cleaning markdown code blocks from response")
      cleanedText = cleanedText
        .replace(/```json\s*/, "")
        .replace(/```$/, "")
        .trim()
    } else if (cleanedText.startsWith("```")) {
      console.log("🧹 Cleaning generic markdown code blocks from response")
      cleanedText = cleanedText
        .replace(/```\s*/, "")
        .replace(/```$/, "")
        .trim()
    }

    console.log("📝 Cleaned text sample:", cleanedText.substring(0, 80) + "...")

    let parsedContent
    try {
      parsedContent = JSON.parse(cleanedText)
      console.log("✅ Successfully parsed response as JSON")
    } catch (error) {
      console.error("❌ Failed to parse response as JSON:", error)
      console.error("❌ Response text (first 200 chars):", cleanedText.substring(0, 200))
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse Grok response as JSON",
          details: {
            error: error instanceof Error ? error.message : String(error),
            textSample: cleanedText.substring(0, 200),
          },
        },
        { status: 500 },
      )
    }

    const result = {
      campaign: parsedContent
    }

    console.log("🎉 Successfully generated system prompt with Grok-3-Fast model", result)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("❌ Error in system prompt generation with Grok:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error generating system prompt with Grok",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
