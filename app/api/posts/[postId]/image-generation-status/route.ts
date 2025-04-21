import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { contentPosts } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function GET(request: Request, { params }: { params: { postId: string } }) {
  try {
    const postId = Number.parseInt(params.postId, 10)

    if (isNaN(postId)) {
      return NextResponse.json({ success: false, error: "Invalid post ID" }, { status: 400 })
    }

    console.log(`Checking image generation status for post ${postId}`)

    // First check our database for the post and its image_status
    const post = await db.select().from(contentPosts).where(eq(contentPosts.id, postId)).limit(1)

    if (!post || post.length === 0) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 })
    }

    const postData = post[0]

    // Check if we already have images in our database
    let images = []
    let hasImages = false

    if (postData.images) {
      try {
        const imagesData = JSON.parse(postData.images)
        images = imagesData.images || []

        // Check if we have any real images (not placeholders)
        hasImages = images.some((img: any) => img.url && !img.url.includes("placeholder.svg"))
      } catch (e) {
        console.error("Error parsing images JSON:", e)
      }
    }

    // If we already have images, return them
    if (hasImages) {
      return NextResponse.json({
        success: true,
        status: "complete",
        message: "Images already generated",
        hasImages: true,
        isComplete: true,
        images: images,
        image_status: postData.image_status || "complete",
      })
    }

    // If image_status indicates generation is still in progress
    if (postData.image_status === "generating") {
      // Call FastAPI to check status
      const fastApiUrl = process.env.FASTAPI_URL
      if (!fastApiUrl) {
        return NextResponse.json(
          {
            success: false,
            error: "FASTAPI_URL environment variable is not set",
            status: "error",
          },
          { status: 500 },
        )
      }

      try {
        // Fix the endpoint URL - use /content/posts/{postId} instead of /content/{postId}
        const endpoint = `${fastApiUrl}/content/posts/${postId}`
        console.log(`Calling FastAPI endpoint: ${endpoint}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.error(`FastAPI error: ${response.status} ${response.statusText}`)

          // Try the old endpoint format as a fallback
          console.log(`Trying fallback endpoint: ${fastApiUrl}/content/${postId}`)
          const fallbackResponse = await fetch(`${fastApiUrl}/content/${postId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            signal: controller.signal,
          })

          if (!fallbackResponse.ok) {
            // If both endpoints fail, return processing status to continue polling
            return NextResponse.json({
              success: true, // Still return success to allow polling to continue
              status: "processing",
              message: "Still processing images",
              hasImages: false,
              isComplete: false,
              image_status: postData.image_status,
            })
          }

          // Use the fallback response if it succeeded
          const fallbackData = await fallbackResponse.json()
          console.log("FastAPI fallback response:", fallbackData)

          // Process the fallback response the same way as the primary response
          if (fallbackData.images && fallbackData.images.length > 0) {
            // Format the images data
            const formattedImages = fallbackData.images.map((img: any, idx: number) => ({
              url: img.url,
              prompt: img.prompt || `Generated image ${idx + 1}`,
              order: idx,
              isSelected: true,
              metadata: {
                width: img.width || 1024,
                height: img.height || 1024,
                style: img.style || "default",
              },
            }))

            // Update the post in our database
            const imagesJson = JSON.stringify({ images: formattedImages })
            await db
              .update(contentPosts)
              .set({
                images: imagesJson,
                imageUrl: formattedImages[0].url,
                image_status: "complete",
              })
              .where(eq(contentPosts.id, postId))

            return NextResponse.json({
              success: true,
              status: "complete",
              message: "Images generated successfully (fallback)",
              hasImages: true,
              isComplete: true,
              images: formattedImages,
              image_status: "complete",
            })
          }

          // If fallback doesn't have images, continue polling
          return NextResponse.json({
            success: true,
            status: "processing",
            message: fallbackData.message || "Still processing images",
            hasImages: false,
            isComplete: false,
            image_status: postData.image_status,
          })
        }

        const data = await response.json()
        console.log("FastAPI response:", data)

        // If FastAPI has images, update our database and return them
        if (data.images && data.images.length > 0) {
          // Format the images data
          const formattedImages = data.images.map((img: any, idx: number) => ({
            url: img.url,
            prompt: img.prompt || `Generated image ${idx + 1}`,
            order: idx,
            isSelected: true,
            metadata: {
              width: img.width || 1024,
              height: img.height || 1024,
              style: img.style || "default",
            },
          }))

          // Update the post in our database
          const imagesJson = JSON.stringify({ images: formattedImages })
          await db
            .update(contentPosts)
            .set({
              images: imagesJson,
              imageUrl: formattedImages[0].url,
              image_status: "complete",
            })
            .where(eq(contentPosts.id, postId))

          return NextResponse.json({
            success: true,
            status: "complete",
            message: "Images generated successfully",
            hasImages: true,
            isComplete: true,
            images: formattedImages,
            image_status: "complete",
          })
        }

        // If FastAPI doesn't have images yet, return processing status
        return NextResponse.json({
          success: true,
          status: "processing",
          message: data.message || "Still processing images",
          hasImages: false,
          isComplete: false,
          image_status: postData.image_status,
        })
      } catch (error) {
        console.error("Error calling FastAPI:", error)

        // If there's a timeout or network error, still return a valid response
        // to allow polling to continue
        return NextResponse.json({
          success: true,
          status: "processing",
          message: "Still checking image status",
          hasImages: false,
          isComplete: false,
          image_status: postData.image_status,
          error: error.message,
        })
      }
    }

    // Default response if no images and not generating
    return NextResponse.json({
      success: true,
      status: "not_started",
      message: "Image generation not started",
      hasImages: false,
      isComplete: false,
      image_status: postData.image_status || "pending",
    })
  } catch (error) {
    console.error("Error in image generation status API route:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Internal error: ${error instanceof Error ? error.message : String(error)}`,
        status: "error",
      },
      { status: 500 },
    )
  }
}
