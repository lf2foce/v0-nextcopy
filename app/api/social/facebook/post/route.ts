import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { postId } = body

    if (!postId) {
      return NextResponse.json({ success: false, error: "Post ID is required" }, { status: 400 })
    }

    console.log(`Sending post ${postId} to FastAPI backend to post to Facebook...`)

    // Get the FastAPI URL from environment variables
    const fastApiUrl = process.env.FASTAPI_URL
    if (!fastApiUrl) {
      console.error("FASTAPI_URL environment variable is not set")
      return NextResponse.json({ success: false, error: "FastAPI URL configuration is missing" }, { status: 500 })
    }

    // Construct the endpoint URL - note we're not sending content in the body
    const endpoint = `${fastApiUrl}/content/${postId}/post_to_facebook`
    console.log(`Calling FastAPI endpoint: ${endpoint}`)

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // No body needed as the FastAPI endpoint doesn't expect content
      })

      console.log(`FastAPI response status: ${response.status}`)

      // Handle non-200 responses
      if (!response.ok) {
        let errorMessage = `FastAPI error: ${response.status} ${response.statusText}`

        try {
          // Try to get detailed error message
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          try {
            const errorText = await response.text()
            if (errorText) {
              errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`
            }
          } catch (textError) {
            // If text extraction fails, use the default error message
          }
        }

        console.error(`Error from FastAPI: ${errorMessage}`)
        return NextResponse.json({ success: false, error: errorMessage }, { status: response.status })
      }

      // Handle successful response
      try {
        const data = await response.json()
        console.log("Successfully posted to Facebook:", data)

        // Update the post status in our database if needed
        // This would be a good place to update the post status to "posted"

        return NextResponse.json({
          success: true,
          data: {
            postId,
            platform: "facebook",
            status: "posted",
            postedAt: new Date().toISOString(),
            ...data,
          },
        })
      } catch (parseError) {
        console.log("Response wasn't valid JSON but the request was successful")
        // If JSON parsing fails but the request was successful, return a success response
        return NextResponse.json({
          success: true,
          data: {
            postId,
            platform: "facebook",
            status: "posted",
            postedAt: new Date().toISOString(),
            message: "Posted successfully (response wasn't valid JSON)",
          },
        })
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
    console.error("Error in Facebook post API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
