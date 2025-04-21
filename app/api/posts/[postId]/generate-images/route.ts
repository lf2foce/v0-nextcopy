import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const postId = params.postId

    if (!postId) {
      return NextResponse.json({ success: false, error: "Post ID is required" }, { status: 400 })
    }

    // Get query parameters from the URL
    const searchParams = request.nextUrl.searchParams
    const numImages = searchParams.get("num_images") || "1"
    const imageStyle = searchParams.get("style") || "realistic"
    const imageService = searchParams.get("image_service") || "" // Add support for image_service parameter

    console.log(`API route: Generating ${numImages} images with style "${imageStyle}" for post ${postId}${imageService ? ` using ${imageService}` : ''}`)

    // Call the FastAPI backend
    const fastApiUrl = process.env.FASTAPI_URL
    if (!fastApiUrl) {
      return NextResponse.json(
        { success: false, error: "FASTAPI_URL environment variable is not set" },
        { status: 500 },
      )
    }

    // Log the URL we're calling for debugging
    let endpoint = `${fastApiUrl}/content/${postId}/generate_images_real?num_images=${numImages}&style=${encodeURIComponent(imageStyle)}`
    
    // Add image_service parameter if provided
    if (imageService) {
      endpoint += `&image_service=${encodeURIComponent(imageService)}`
    }
    
    console.log(`Calling FastAPI endpoint: ${endpoint}`)

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })

      // Log the response status
      console.log(`FastAPI response status: ${response.status}`)

      // If response is not ok, handle it properly
      if (!response.ok) {
        let errorMessage = `FastAPI error: ${response.status} ${response.statusText}`

        // Try to get the error details - first as JSON, then as text
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (jsonError) {
          // If JSON parsing fails, try to get the response as text
          try {
            const errorText = await response.text()
            if (errorText) {
              errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`
            }
          } catch (textError) {
            // If even text extraction fails, use the default error message
          }
        }

        console.error(`Error from FastAPI: ${errorMessage}`)
        return NextResponse.json({ success: false, error: errorMessage }, { status: response.status })
      }

      // Parse the successful response
      try {
        const data = await response.json()
        console.log("FastAPI success response:", data)

        // Check if this is a processing response (async generation started)
        if (data.status === "processing" || data.message?.includes("background")) {
          // Update the post's image_status to "generating" in our database
          const db = (await import("@/lib/db")).db
          const contentPosts = (await import("@/lib/schema")).contentPosts
          const eq = (await import("drizzle-orm")).eq

          await db
            .update(contentPosts)
            .set({ image_status: "generating" })
            .where(eq(contentPosts.id, Number.parseInt(postId)))

          // Return success with processing status
          return NextResponse.json({
            success: true,
            data: {
              status: "processing",
              message: "Image generation started in background",
            },
          })
        }

        // If we have immediate results (unlikely but possible)
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          return NextResponse.json({
            success: true,
            data: data,
          })
        }

        // If we don't have images but it's not an error (just processing)
        return NextResponse.json({
          success: true,
          data: {
            status: "processing",
            message: "Image generation in progress",
          },
        })
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError)

        // Try to get the response as text if JSON parsing fails
        try {
          const text = await response.text()
          console.log("Response as text:", text.substring(0, 200) + "...")

          // Check if the text contains indication of background processing
          if (text.includes("background") || text.includes("processing")) {
            return NextResponse.json({
              success: true,
              data: {
                status: "processing",
                message: "Image generation started in background",
              },
            })
          }

          return NextResponse.json(
            {
              success: false,
              error: "Invalid JSON response from server",
              details: parseError instanceof Error ? parseError.message : String(parseError),
              responseText: text.substring(0, 500), // Include part of the response for debugging
            },
            { status: 500 },
          )
        } catch (textError) {
          return NextResponse.json(
            {
              success: false,
              error: "Invalid JSON response from server and couldn't read as text",
              details: parseError instanceof Error ? parseError.message : String(parseError),
            },
            { status: 500 },
          )
        }
      }
    } catch (fetchError) {
      console.error("Network error when calling FastAPI:", fetchError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to connect to FastAPI: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
        },
        { status: 503 },
      )
    }
  } catch (error) {
    console.error("Error in generate images API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate images",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
