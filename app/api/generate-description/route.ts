import { generateText } from "ai"
// import { openai } from "@ai-sdk/openai" // Commented out OpenAI
import { cerebras } from "@ai-sdk/cerebras" // Added Cerebras for Llama 4 Scout
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch((err) => {
      console.error("Failed to parse request body:", err)
      return {}
    })

    const { existingDescription } = body

    // Default User Prompt (if no existing description)
    const defaultPrompt = `
Chiến dịch mô tả:

- Sản phẩm: Máy lọc không khí mini cho gia đình
- Mục tiêu: Bán hàng ngay
- Nền tảng đăng: Shopee
- Kiểu bài: Mô tả sản phẩm ngắn
- Phong cách: Thân thiện, dễ hiểu
- Từ khóa chính: máy lọc không khí mini
- Từ khóa phụ: không khí sạch, bảo vệ sức khỏe
- Gợi ý hình ảnh: sạch sẽ, tươi sáng
- Thêm: CTA mạnh kêu gọi đặt hàng ngay
`
    // System Prompt: common rules for all content
    const systemPrompt = `
You are a content specialist.

Your task is to write a  product or service description based on the provided criteria.

Each description must:
- Clearly and attractively introduce the product, service, or topic.
- Reflect the main goal (e.g., immediate sales, increase engagement, build brand awareness, or maintain presence) naturally through the text.
- Suit the intended platform (e.g., Facebook, Shopee, Instagram, Website, TikTok...).
- Use the specified writing style (e.g., short storytelling, quick sales post, listicle, product description...).
- Match the required tone (e.g., friendly, professional, emotional, humorous...).
- Naturally integrate the provided main and secondary keywords.
- Evoke the suggested imagery (e.g., bright, minimalist, prominent...) through word choice and structure.
- End with a strong call-to-action (CTA) or hashtags if appropriate.

Requirements:
- Strictly follow all provided criteria.
- Only write a natural, complete description in Vietnamese.
- Do not explain, analyze, or list the criteria separately.
- Do not repeat the instructions in the output.

Mandatory: You must naturally cover every provided point in the final description.

Ví dụ đầu ra: "${defaultPrompt}"
`

    // Improve Prompt (if there's an existing description)
    const improvePrompt = (description: string) => `
Based on the following campaign description: "${description}".

Rewrite it into a campaign description,
strictly covering:
- The product or service
- The main goal
- The target platform
- The writing style
- The tone
- Main and secondary keywords
- Suggested imagery
- A strong CTA if applicable

Important:
- Write in Vietnamese.
- Do not list the criteria explicitly.
- Only return the complete rewritten description.
- Strictly follow all points naturally in the flow of the text.
`

    const prompt =
      existingDescription && existingDescription.trim() !== "" ? improvePrompt(existingDescription) : defaultPrompt

    console.log("Generating description with prompt:", prompt)

    try {
      // Check for API key - using CEREBRAS_API_KEY instead of OPENAI_API_KEY
      if (!process.env.CEREBRAS_API_KEY) {
        console.error("CEREBRAS_API_KEY is not set")
        return NextResponse.json(
          {
            error: "Cerebras API key is not configured",
            description:
              "Chưa cấu hình API key. Đây là nội dung mẫu: Máy lọc không khí mini - bảo vệ không gian sống cho gia đình bạn.",
          },
          { status: 200 },
        )
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // Increased timeout for Llama

      try {
        // Using Llama 4 Scout model from Cerebras instead of OpenAI
        const { text } = await generateText({
          // model: cerebras("llama3.3-70b"), // Using Llama 4 Scout model
          model: cerebras("llama-4-scout-17b-16e-instruct"), // Using Llama 4 Scout model
          //model: openai("gpt-4o-mini")
          system: systemPrompt,
          prompt: prompt,
          maxTokens: 300,
          temperature: 0.7,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        console.log("Generated description successfully")
        return NextResponse.json({ description: text })
      } catch (abortError) {
        clearTimeout(timeoutId)
        if (abortError.name === "AbortError") {
          console.error("Request timed out")
          return NextResponse.json(
            {
              error: "Request timed out",
              description:
                "Hệ thống mất quá nhiều thời gian để phản hồi. Đây là nội dung mẫu: Máy lọc không khí mini - bảo vệ không gian sống cho gia đình bạn.",
            },
            { status: 200 },
          )
        }
        throw abortError
      }
    } catch (aiError: any) {
      console.error("AI SDK error:", aiError)

      return NextResponse.json(
        {
          error: `AI SDK error: ${aiError.message}`,
          description:
            "Chiến dịch nhằm tăng cường nhận diện thương hiệu và thu hút khách hàng tiềm năng thông qua nội dung hấp dẫn và gần gũi.",
        },
        { status: 200 },
      )
    }
  } catch (error: any) {
    console.error("Error generating description:", error)

    return NextResponse.json(
      {
        error: `Failed to generate description: ${error.message}`,
        description:
          "Một chiến dịch tiếp thị chiến lược nhằm tăng chuyển đổi và giữ chân khách hàng thông qua trải nghiệm cá nhân hóa và thông điệp hấp dẫn.",
      },
      { status: 200 },
    )
  }
}
