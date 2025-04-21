import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    // Ensure params is fully resolved before accessing properties
    const { postId } = await params

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

      // Clone the response for multiple reads
      const responseClone = response.clone();

      // If response is not ok, handle it properly
      if (!response.ok) {
        let errorMessage = `FastAPI error: ${response.status} ${response.statusText}`
        let responseText = "";

        try {
          responseText = await response.text();
          console.log("Error response text:", responseText.substring(0, 500));
          
          try {
            // Try parsing as JSON if possible
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.detail || errorData.error || errorData.message || errorMessage;
          } catch (jsonError) {
            // Not valid JSON, use the text response
            if (responseText) {
              errorMessage = `${errorMessage} - ${responseText.substring(0, 100)}`;
            }
          }
        } catch (textError) {
          console.error("Failed to read error response as text:", textError);
        }

        console.error(`Error from FastAPI: ${errorMessage}`);
        return NextResponse.json({ success: false, error: errorMessage }, { status: response.status });
      }

      // Try to get the full response text first
      let responseText;
      try {
        responseText = await responseClone.text();
        console.log("Response text length:", responseText.length);
        console.log("Response text preview:", responseText.substring(0, 200) + "...");
      } catch (textError) {
        console.error("Failed to read response as text:", textError);
      }

      // Check if the text contains indication of background processing
      if (responseText && (responseText.includes("background") || responseText.includes("processing"))) {
        // Update the post's image_status to "generating" in our database
        const db = (await import("@/lib/db")).db;
        const contentPosts = (await import("@/lib/schema")).contentPosts;
        const eq = (await import("drizzle-orm")).eq;

        await db
          .update(contentPosts)
          .set({ image_status: "generating" })
          .where(eq(contentPosts.id, Number.parseInt(postId)));

        return NextResponse.json({
          success: true,
          data: {
            status: "processing",
            message: "Image generation started in background",
          },
        });
      }

      // Try to parse as JSON
      try {
        const data = responseText ? JSON.parse(responseText) : await response.json();
        console.log("FastAPI success response:", data);

        // Check if this is a processing response (async generation started)
        if (data.status === "processing" || data.message?.includes("background")) {
          // Update the post's image_status to "generating" in our database
          const db = (await import("@/lib/db")).db;
          const contentPosts = (await import("@/lib/schema")).contentPosts;
          const eq = (await import("drizzle-orm")).eq;

          await db
            .update(contentPosts)
            .set({ image_status: "generating" })
            .where(eq(contentPosts.id, Number.parseInt(postId)));

          // Return success with processing status
          return NextResponse.json({
            success: true,
            data: {
              status: "processing",
              message: "Image generation started in background",
            },
          });
        }

        // If we have immediate results (unlikely but possible)
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          return NextResponse.json({
            success: true,
            data: data,
          });
        }

        // If we don't have images but it's not an error (just processing)
        return NextResponse.json({
          success: true,
          data: {
            status: "processing",
            message: "Image generation in progress",
          },
        });
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);
        
        // Return a more useful error message with the response text
        return NextResponse.json(
          {
            success: false,
            error: "Invalid JSON response from server",
            details: parseError instanceof Error ? parseError.message : String(parseError),
            responseText: responseText ? responseText.substring(0, 500) : "No response text available",
          },
          { status: 500 },
        );
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
