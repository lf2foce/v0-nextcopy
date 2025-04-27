"use server"

import { db } from "./db"
import { themes, contentPosts, campaigns } from "./schema"
import { eq } from "drizzle-orm"
import { getCampaignSteps } from "./campaign-steps" // Import from campaign-steps.ts
import { updatePostImages, updateCampaignStep } from "./actions" // Import from actions.ts
import { desc } from "drizzle-orm" // Add this import for getAllCampaigns

// Replace the existing getSiteUrl function with this improved version
function getSiteUrl(): string {
  // Check if we're in a browser environment
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  // Server-side: check all possible environment variables in order of preference
  // First check the explicitly set public URLs
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL
  }

  // Then check Vercel deployment URL
  if (process.env.VERCEL_URL) {
    // Ensure it has https:// prefix
    return `https://${process.env.VERCEL_URL}`
  }

  // Final fallback for local development
  return "http://localhost:3000"
}

// Define types for CampaignType and ThemeType
type CampaignType = {
  id: number
  name: string
  description: string
}

type ThemeType = {
  id: string
  name: string
  description: string
  campaignId: number
}

// Get all campaigns with status
export async function getAllCampaigns() {
  try {
    // Use standard select instead of query builder
    const allCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.id))

    // Determine UI status based on database status and currentStep
    const mappedCampaigns = allCampaigns.map((campaign) => {
      // Map status for UI:
      // - "scheduled" for campaigns at step 8 (fully scheduled)
      // - "draft" for all other campaigns (in progress/incomplete)
      const uiStatus = campaign.currentStep === 8 ? "scheduled" : "draft"

      return {
        ...campaign,
        status: uiStatus,
        // Make sure isActive is included (default to true if not set)
        isActive: campaign.isActive !== undefined ? campaign.isActive : true,
      }
    })

    return { success: true, data: mappedCampaigns }
  } catch (error) {
    console.error("Failed to get campaigns:", error)
    return {
      success: false,
      error: "Failed to get campaigns: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Generate themes for a campaign
export async function generateThemes(campaignId: number) {
  console.log("Server action: generateThemes called with campaignId:", campaignId)

  try {
    // Use the external API via our proxy endpoint
    console.log("Fetching themes from external API")

    if (!process.env.FASTAPI_URL) {
      return {
        success: false,
        error: "FASTAPI_URL environment variable is not set",
      }
    }

    try {
      const siteUrl = getSiteUrl()
      const response = await fetch(`${siteUrl}/api/copy/themes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignId }),
      })

      if (!response.ok) {
        // Try to get error details - first as JSON, then as text
        let errorMessage = `External API error: ${response.status} ${response.statusText}`

        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
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

        console.error("API error:", errorMessage)
        throw new Error(errorMessage)
      }

      // Try to parse the response as JSON with better error handling
      try {
        const apiResult = await response.json()

        if (!apiResult.success) {
          throw new Error(apiResult.error || "API returned unsuccessful response")
        }

        // Process the themes from the API
        const apiThemes = apiResult.data

        // First, delete all existing themes for this campaign
        await db.delete(themes).where(eq(themes.campaignId, campaignId))

        // Map API themes to our database schema
        const themesToInsert = apiThemes.map((theme: any) => ({
          campaignId,
          title: theme.name || theme.title,
          story: theme.description || theme.story,
          isSelected: false,
          status: "pending",
          post_status: theme.post_status || "pending", // Add post_status field
        }))

        console.log("Inserting themes from API:", themesToInsert)
        const insertedThemes = await db.insert(themes).values(themesToInsert).returning()
        console.log("Inserted themes:", insertedThemes)

        // Update campaign step to Generate Theme (2)
        const steps = await getCampaignSteps()
        await updateCampaignStep(campaignId, steps.GENERATE_THEME)

        return { success: true, data: insertedThemes }
      } catch (parseError) {
        console.error("Error parsing API response:", parseError)

        // Try to get the response body as text for better error reporting
        try {
          const responseText = await response.text()
          console.error("Response body:", responseText.substring(0, 200))
          throw new Error(
            `Failed to parse API response: ${parseError.message}. Response starts with: ${responseText.substring(0, 50)}...`,
          )
        } catch (textError) {
          throw new Error(`Failed to parse API response: ${parseError.message}`)
        }
      }
    } catch (fetchError) {
      console.error("Fetch error when calling external API:", fetchError)
      throw new Error(`Failed to connect to external API: ${fetchError.message}`)
    }
  } catch (error) {
    console.error("Failed to generate themes:", error)
    return {
      success: false,
      error: "Failed to generate themes: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Select a theme for a campaign
export async function selectTheme(themeId: number) {
  try {
    console.log(`Selecting theme ${themeId} via external API`)

    // Use the external API via our proxy endpoint
    const siteUrl = getSiteUrl()
    const response = await fetch(`${siteUrl}/api/copy/themes/select`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ themeId }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API error (${response.status}):`, errorText)

      // Try to parse as JSON if possible
      let errorData = null
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        // Not JSON, use text as is
      }

      throw new Error(errorData?.error || `Failed to select theme from API: ${response.status} ${response.statusText}`)
    }

    // Process the API response
    const apiResult = await response.json()

    if (!apiResult.success) {
      throw new Error(apiResult.error || "API returned unsuccessful response")
    }

    console.log("Theme selected via API:", apiResult.data)

    // Update campaign step to Generate Post (now 3 instead of 4)
    // Get the theme to find its campaignId
    const [themeData] = await db.select().from(themes).where(eq(themes.id, themeId)).limit(1)

    if (themeData) {
      const campaignId = themeData.campaignId
      const steps = await getCampaignSteps()
      await updateCampaignStep(campaignId, steps.GENERATE_POST)

      // Update the theme status in our database to reflect the selection
      await db
        .update(themes)
        .set({
          isSelected: true,
          status: "selected",
        })
        .where(eq(themes.id, themeId))
    }

    return {
      success: true,
      data: apiResult.data,
      themeId: themeId,
    }
  } catch (error) {
    console.error("Failed to select theme:", error)
    return {
      success: false,
      error: "Failed to select theme: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Function to check theme post status
export async function checkThemePostStatus(themeId: number) {
  try {
    // Get the theme from the database
    const [themeData] = await db.select().from(themes).where(eq(themes.id, themeId)).limit(1)

    if (!themeData) {
      return {
        success: false,
        error: "Theme not found",
      }
    }

    // Check if the post_status is "ready" - this is the key indicator
    const isReady = themeData.post_status === "ready"

    // If the theme is ready, fetch the posts
    let posts = []
    if (isReady) {
      posts = await db.select().from(contentPosts).where(eq(contentPosts.themeId, themeId))
    }

    return {
      success: true,
      data: {
        status: themeData.post_status || "pending",
        posts: posts,
        isReady: isReady,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: "Failed to check theme post status: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Check image generation status for a post
export async function checkImageGenerationStatus(postId: number) {
  try {
    console.log(`Checking image generation status for post ${postId}`)

    // Get the post from the database to check its image_status
    const [post] = await db.select().from(contentPosts).where(eq(contentPosts.id, postId)).limit(1)

    if (!post) {
      return {
        success: false,
        error: "Post not found",
      }
    }

    // Return the current status and any images if they exist
    let images = []
    if (post.images) {
      try {
        const imagesData = JSON.parse(post.images)
        images = imagesData.images?.images || imagesData.images || []

        // Filter out placeholder images and blob URLs
        images = images.filter((img: any) => {
          return img && img.url && !img.url.includes("placeholder.svg") && !img.url.startsWith("blob:")
        })
      } catch (e) {
        console.error("Error parsing images JSON:", e)
      }
    }

    // Check if we have real images (not placeholders)
    const hasRealImages = images.length > 0

    // Determine the status based on image_status field and presence of images
    let status = post.image_status || "pending"
    let isComplete = status === "completed" || hasRealImages

    // If status is "generating" but we have images, update status to "completed"
    if ((status === "generating" || status === "pending") && hasRealImages) {
      // Update the status in the database
      await db.update(contentPosts).set({ image_status: "completed" }).where(eq(contentPosts.id, postId))
      status = "completed"
      isComplete = true
    }

    // Log the result for debugging
    console.log(`Post ${postId} status: ${status}, hasImages: ${hasRealImages}, imageCount: ${images.length}`)

    return {
      success: true,
      data: {
        status: status,
        isComplete: isComplete,
        hasImages: hasRealImages,
        images: images,
        imageUrl: post.imageUrl,
      },
    }
  } catch (error) {
    console.error("Failed to check image generation status:", error)
    return {
      success: false,
      error: "Failed to check image status: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Process image generation with error handling
export async function processImageGeneration(
  postId: number,
  numImages: number,
  imageStyle: string,
  imageService: string,
) {
  try {
    // Use debug level logging instead of info level
    console.debug(
      `Processing image generation: ${numImages} images with style "${imageStyle}" using service "${imageService}" for post ${postId}`,
    )

    // First update the post's image_status to "generating"
    await db.update(contentPosts).set({ image_status: "generating" }).where(eq(contentPosts.id, postId))

    const siteUrl = getSiteUrl()
    const response = await fetch(
      `${siteUrl}/api/posts/${postId}/generate-images?num_images=${numImages}&style=${encodeURIComponent(imageStyle)}&image_service=${encodeURIComponent(imageService)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorMessage = await handleApiError(response)
      console.error("Failed to generate images:", errorMessage)

      // Reset status to pending on error
      await db.update(contentPosts).set({ image_status: "pending" }).where(eq(contentPosts.id, postId))

      return { success: false, error: errorMessage }
    }

    const result = await response.json()

    // Return the result with appropriate status
    if (result.data?.status === "processing") {
      return {
        success: true,
        status: "processing",
        message: result.data.message || "Image generation started in background",
      }
    }

    if (result.data?.images && Array.isArray(result.data.images) && result.data.images.length > 0) {
      // Update the post with the new images if they're immediately available
      try {
        const imageData = result.data.images

        // Use updatePostImages from actions.ts
        await updatePostImages([
          {
            id: postId,
            image: imageData[0]?.url || "",
          },
        ])

        // Also update the full images data
        await db
          .update(contentPosts)
          .set({
            images: JSON.stringify({
              images: imageData.map((img: any, idx: number) => ({
                ...img,
                isSelected: true,
                order: idx,
              })),
            }),
            image_status: "completed",
          })
          .where(eq(contentPosts.id, postId))
      } catch (dbError) {
        console.error("Error updating post with new images:", dbError)
      }

      return {
        success: true,
        status: "completed",
        images: result.data.images,
      }
    }

    if (result.success) {
      return {
        success: true,
        status: "processing",
        message: "Image generation in progress",
      }
    }

    // Reset status to pending if we get here (no images and not processing)
    await db.update(contentPosts).set({ image_status: "pending" }).where(eq(contentPosts.id, postId))

    return {
      success: false,
      error: "API returned no image data",
    }
  } catch (error) {
    console.error("Error in processImageGeneration:", error)

    // Reset status to pending on error
    try {
      await db.update(contentPosts).set({ image_status: "pending" }).where(eq(contentPosts.id, postId))
    } catch (dbError) {
      console.error("Error resetting image status:", dbError)
    }

    return {
      success: false,
      error: "Failed to process image generation: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Post to social media
export async function postToSocialMedia(postId: number, platform: string, content: string) {
  try {
    console.log(`Posting to ${platform} for post ID ${postId}`)

    // Call the API route - note we're not using content parameter anymore
    const siteUrl = getSiteUrl()
    const response = await fetch(`${siteUrl}/api/social/${platform}/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId }),
    })

    // Log the response status for debugging
    console.log(`API response status: ${response.status} ${response.statusText}`)

    // First check if the response is ok
    if (!response.ok) {
      // Try to parse as JSON, but handle text response if it's not valid JSON
      try {
        const errorData = await response.json()
        console.error("Error response data:", errorData)
        return {
          success: false,
          error: errorData.error || `Failed to post to ${platform}: ${response.status} ${response.statusText}`,
        }
      } catch (parseError) {
        // If JSON parsing fails, get the response as text instead
        try {
          const errorText = await response.text()
          console.error("Error response text:", errorText)
          return {
            success: false,
            error: `Failed to post to ${platform}: ${errorText.substring(0, 100)}...`,
          }
        } catch (textError) {
          // If even text extraction fails
          return {
            success: false,
            error: `Failed to post to ${platform}: ${response.status} ${response.statusText}`,
          }
        }
      }
    }

    // Try to parse the successful response as JSON
    try {
      const result = await response.json()
      console.log("Success response:", result)

      // Update the post status in our database if needed
      // This would be a good place to update the post status to "posted"

      return { success: true, data: result }
    } catch (parseError) {
      console.error("JSON parse error for successful response:", parseError)
      // If JSON parsing fails for a successful response, still return success
      return {
        success: true,
        data: { message: "Posted successfully, but response wasn't valid JSON" },
      }
    }
  } catch (error) {
    console.error(`Failed to post to ${platform}:`, error)
    return {
      success: false,
      error: `Failed to post to ${platform}: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Save image selection to database
export async function saveImageSelection(postId: number, images: string, mainImageUrl: string) {
  try {
    // Use updatePostImages from actions.ts
    await updatePostImages([{ id: postId, image: mainImageUrl }])

    // Update the full images data directly
    await db
      .update(contentPosts)
      .set({
        images: images,
        image_status: "completed",
      })
      .where(eq(contentPosts.id, postId))

    return { success: true }
  } catch (error) {
    console.error("Error saving image selection to database:", error)
    return {
      success: false,
      error: "Failed to save selection: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Clear images for a post
export async function clearPostImages(postId: number, placeholderImages: any) {
  try {
    // Use updatePostImages from actions.ts
    await updatePostImages([{ id: postId, image: "" }])

    // Update the images data directly
    await db
      .update(contentPosts)
      .set({
        images: JSON.stringify({ images: placeholderImages }),
        image_status: "pending",
      })
      .where(eq(contentPosts.id, postId))

    return { success: true }
  } catch (error) {
    console.error("Error clearing images:", error)
    return {
      success: false,
      error: "Failed to clear images: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Handle API error responses
export async function handleApiError(response: Response): Promise<string> {
  const errorMessage = `Error: ${response.status} ${response.statusText}`

  try {
    const errorData = await response.json()
    return errorData.error || errorMessage
  } catch {
    try {
      const errorText = await response.text()
      return errorText ? `${errorMessage} - ${errorText.substring(0, 100)}` : errorMessage
    } catch {
      return errorMessage
    }
  }
}
