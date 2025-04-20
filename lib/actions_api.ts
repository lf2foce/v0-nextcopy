"use server"
import { db } from "./db"
import { themes, contentPosts } from "./schema"
import { eq } from "drizzle-orm"
import { updateCampaignStep, getCampaignSteps } from "./actions"
import type { Theme as ThemeType } from "../components/campaign-workflow"
import type { Campaign as CampaignType } from "../components/campaign-workflow"
import type { NewTheme } from "./schema"

// Theme ideas for different types of campaigns - kept for mock generation
const themeIdeas = [
  {
    name: "Bold & Vibrant",
    description: "High contrast colors with bold typography for maximum impact",
  },
  {
    name: "Minimalist",
    description: "Clean, simple designs with plenty of white space",
  },
  {
    name: "Retro Wave",
    description: "80s inspired neon colors and geometric patterns",
  },
  {
    name: "Nature Inspired",
    description: "Organic shapes and earthy color palette",
  },
  {
    name: "Elegant & Sophisticated",
    description: "Refined aesthetics with luxury appeal and subtle details",
  },
  {
    name: "Playful & Fun",
    description: "Whimsical elements with bright colors and casual typography",
  },
  {
    name: "Tech & Modern",
    description: "Sleek, futuristic design with cutting-edge aesthetics",
  },
  {
    name: "Vintage Charm",
    description: "Classic elements with a nostalgic feel and timeless appeal",
  },
  {
    name: "Urban Street",
    description: "Gritty textures with bold graphics and contemporary edge",
  },
  {
    name: "Handcrafted",
    description: "Artisanal feel with hand-drawn elements and organic textures",
  },
]

// Function to generate random themes based on campaign details - kept for testing
const generateRandomThemes = (campaign: CampaignType, count = 4): ThemeType[] => {
  // Shuffle the theme ideas array
  const shuffled = [...themeIdeas].sort(() => 0.5 - Math.random())

  // Take the first 'count' items
  const selectedThemes = shuffled.slice(0, count)

  // Map to Theme type with campaign ID
  return selectedThemes.map((theme, index) => ({
    id: `mock-${Date.now()}-${index}`,
    name: theme.name,
    description: theme.description,
    campaignId: campaign.id,
  }))
}

// Generate themes for a campaign - updated to use external API
export async function generateThemes(campaignId: number, themesData?: ThemeType[], useMock = false) {
  console.log("Server action: generateThemes called with campaignId:", campaignId)

  try {
    // If useMock is true or themesData is provided, use the mock generation
    if (useMock || themesData) {
      console.log("Using mock theme generation")

      // First, delete all existing themes for this campaign
      await db.delete(themes).where(eq(themes.campaignId, campaignId))

      const themesToInsert: NewTheme[] = (themesData || []).map((theme) => ({
        campaignId,
        title: theme.name,
        story: theme.description,
        isSelected: false,
        status: "pending",
      }))

      console.log("Inserting themes:", themesToInsert)
      const insertedThemes = await db.insert(themes).values(themesToInsert).returning()
      console.log("Inserted themes:", insertedThemes)

      // Update campaign step to Generate Theme (2) - no change needed here
      const CAMPAIGN_STEPS = await getCampaignSteps()
      await updateCampaignStep(campaignId, CAMPAIGN_STEPS.GENERATE_THEME)

      return { success: true, data: insertedThemes }
    }

    // Use the external API via our proxy endpoint
    console.log("Fetching themes from external API")
    try {
      const response = await fetch("https://nextcopy.vercel.app/api/copy/themes/generate", {
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
        const themesToInsert: NewTheme[] = apiThemes.map((theme: any) => ({
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
        const CAMPAIGN_STEPS = await getCampaignSteps()
        await updateCampaignStep(campaignId, CAMPAIGN_STEPS.GENERATE_THEME)

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

// Select a theme for a campaign - updated to rely solely on external API
export async function selectTheme(themeId: number) {
  try {
    console.log(`Selecting theme ${themeId} via external API`)

    // Use the external API via our proxy endpoint
    const response = await fetch("https://nextcopy.vercel.app/api/copy/themes/select", {
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
      const CAMPAIGN_STEPS = await getCampaignSteps()
      await updateCampaignStep(campaignId, CAMPAIGN_STEPS.GENERATE_POST)

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

// Function to check theme post status - FIXED to properly check post_status column
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

// Update the generateImagesForPost function to handle async generation and style
export async function generateImagesForPost(postId: number, numImages = 1, imageStyle = "realistic") {
  try {
    console.log(`Generating ${numImages} images with style "${imageStyle}" for post ${postId}`)

    // Call our API route that will call the FastAPI backend
    const response = await fetch(
      `https://nextcopy.vercel.app/api/posts/${postId}/generate-images?num_images=${numImages}&style=${encodeURIComponent(imageStyle)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    // Handle non-JSON responses better
    if (!response.ok) {
      let errorMessage = `Failed to generate images: ${response.status} ${response.statusText}`

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

      console.error("Error generating images:", errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    }

    // Parse the successful response
    try {
      const result = await response.json()
      console.log("API response for image generation:", result)

      // Check if this is a processing response (async generation started)
      if (result.data?.status === "processing") {
        return {
          success: true,
          data: {
            status: "processing",
            message: result.data.message || "Image generation started in background",
          },
        }
      }

      // If we have immediate results (unlikely but possible)
      if (result.data?.images && Array.isArray(result.data.images) && result.data.images.length > 0) {
        // Update the post with the new images
        try {
          const { updatePostImages } = await import("./actions")
          const imageData = result.data.images

          const formattedData = {
            images: imageData.map((img: any, idx: number) => ({
              ...img,
              isSelected: true,
              order: idx,
            })),
          }

          await updatePostImages([
            {
              id: postId,
              image: imageData[0]?.url || "",
              imagesJson: JSON.stringify(formattedData),
            },
          ])
        } catch (dbError) {
          console.error("Error updating post with new images:", dbError)
        }
      }

      return { success: true, data: result.data }
    } catch (parseError) {
      console.error("Error parsing JSON response:", parseError)
      return {
        success: false,
        error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      }
    }
  } catch (error) {
    console.error("Failed to generate images for post:", error)
    return {
      success: false,
      error: "Failed to generate images: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Add this function to check image generation status for a post
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
      } catch (e) {
        console.error("Error parsing images JSON:", e)
      }
    }

    // Filter out any placeholder images for more accurate status reporting
    const realImages = images.filter((img: any) => 
      img.url && typeof img.url === 'string' && !img.url.includes('placeholder.svg')
    );
    
    return {
      success: true,
      data: {
        status: post.image_status || "pending",
        isComplete: post.image_status === "completed",
        hasImages: realImages.length > 0,
        images: realImages.length > 0 ? realImages : images,
        imageUrl: post.imageUrl,
        updatedAt: post.updatedAt || new Date(), // Include timestamp for cache busting
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
