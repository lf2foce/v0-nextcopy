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
      // Add timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(`https://techlocal-copy.onrender.com/themes/${themeId}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Log the response status
      console.log(`External API response status: ${response.status}`)

      // Handle rate limiting specifically
      if (response.status === 429) {
        console.log("Rate limited by external API")

        // Get retry-after header if available
        const retryAfter = response.headers.get("Retry-After")

        return NextResponse.json(
          {
            success: false,
            error: "Rate limited by external API. Please try again later.",
            retryAfter: retryAfter ? Number.parseInt(retryAfter) : 30,
          },
          {
            status: 429,
            headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
          },
        )
      }

      // If response is not ok, handle it properly
      if (!response.ok) {
        let errorMessage = `External API error: ${response.status} ${response.statusText}`

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

        console.error(`Error from external API: ${errorMessage}`)
        return NextResponse.json({ success: false, error: errorMessage }, { status: response.status })
      }

      // Parse the successful response
      try {
        const data = await response.json()
        console.log("External API success response:", data)
        return NextResponse.json({ success: true, data })
      } catch (parseError) {
        // If JSON parsing fails, try to get the response as text
        try {
          const text = await response.text()
          console.log("Response as text:", text.substring(0, 200) + "...")

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
              error: "Invalid response from server",
              details: parseError instanceof Error ? parseError.message : String(parseError),
            },
            { status: 500 },
          )
        }
      }
    } catch (fetchError) {
      console.error("Network error when calling external API:", fetchError)

      // Handle abort errors (timeouts) specifically
      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Request to external API timed out after 10 seconds",
          },
          { status: 504 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: `Failed to connect to external API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
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
