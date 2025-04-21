"use server"
import { db } from "./db"
import { campaigns, themes, contentPosts } from "./schema"
import { eq, and, inArray, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import * as actions_api from "./actions_api"

// Types
import type { Campaign as CampaignType } from "@/types"
import type { Post as PostType } from "@/types"
import type { NewCampaign, NewContentPost } from "./schema"

// Define step constants for clarity
export async function getCampaignSteps() {
  return {
    NEW: 0,
    GENERATE_THEME: 2, // Both theme steps combined as 2
    SELECT_THEME: 2, // Both theme steps combined as 2
    GENERATE_POST: 3, // Both post steps combined as 3
    APPROVE_POST: 3, // Both post steps combined as 3
    GENERATE_IMAGES: 4, // Updated from 5 to 4
    GENERATE_VIDEO: 5, // Updated from 6 to 5
    REVIEW: 6, // Updated from 7 to 6
    COMPLETION: 7, // Updated from 8 to 7
    SCHEDULED: 8, // Updated from 9 to 8
  }
}

// Create a new campaign
export async function createCampaign(data: CampaignType) {
  try {
    console.log("Creating campaign with data:", data)

    const CAMPAIGN_STEPS = await getCampaignSteps()

    const newCampaign: NewCampaign = {
      title: data.name,
      description: data.description,
      targetCustomer: data.target,
      repeatEveryDays: data.repeatEveryDays || 7,
      insight: data.insight || "",
      status: "draft",
      currentStep: CAMPAIGN_STEPS.NEW,
      isActive: true,
      startDate: (data.startDate || new Date()).toISOString(),
    }

    const [campaign] = await db.insert(campaigns).values(newCampaign).returning()

    console.log("Campaign created in database:", campaign)

    // Revalidate the campaigns page to show the new campaign
    revalidatePath("/campaigns")

    return { success: true, data: campaign }
  } catch (error) {
    console.error("Failed to create campaign:", error)
    return {
      success: false,
      error: "Failed to create campaign: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Update campaign step
export async function updateCampaignStep(campaignId: number, step: number) {
  try {
    console.log(`Updating campaign ${campaignId} to step ${step}`)

    // Update both currentStep and status if needed
    let status: "draft" | "active" | "archived" = "draft"
    const CAMPAIGN_STEPS = await getCampaignSteps()
    if (step === CAMPAIGN_STEPS.SCHEDULED) {
      status = "active" // Only set to active when fully scheduled (step 8)
    }

    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        currentStep: step,
        status: status,
      })
      .where(eq(campaigns.id, campaignId))
      .returning()

    // Revalidate both the campaigns list and the specific campaign page
    revalidatePath("/campaigns")
    revalidatePath(`/campaigns/${campaignId}`)

    return { success: true, data: updatedCampaign }
  } catch (error) {
    console.error("Failed to update campaign step:", error)
    return {
      success: false,
      error: "Failed to update campaign step: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Get campaign with current step
export async function getCampaignWithStep(id: number) {
  try {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1)
    return { success: true, data: campaign }
  } catch (error) {
    console.error("Failed to get campaign:", error)
    return { success: false, error: "Failed to get campaign" }
  }
}

// Export the API functions
export const generateThemes = actions_api.generateThemes
// Update the exported selectTheme function to match the new signature
export const selectTheme = actions_api.selectTheme
// Add this line to the exports section
export const checkThemePostStatus = actions_api.checkThemePostStatus
// Export the generateImagesForPost function from actions_api
export const generateImagesForPost = actions_api.generateImagesForPost

/**
 * Fetches posts for a specific theme
 * Used in generate-approve-content.tsx
 */
export async function fetchPostsForTheme(campaignId: number, themeId: number) {
  try {
    console.log(`Fetching posts for campaign ${campaignId} and theme ${themeId}`)
    
    // Use an absolute URL constructed from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    // We'll include campaignId as a query parameter
    const apiUrl = new URL(`/api/copy/themes/${themeId}/posts`, baseUrl);
    apiUrl.searchParams.append('campaignId', campaignId.toString());
    
    console.log(`Making API request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // Prevent caching issues
      cache: "no-store",
    });

    if (!response.ok) {
      let errorMessage = `Failed to fetch posts: ${response.status} ${response.statusText}`

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

      console.error("Error fetching posts:", errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    }

    // Parse the successful response
    const result = await response.json()
    
    return {
      success: true,
      data: result.data || result.posts || result,
    }
  } catch (error) {
    console.error("Error fetching posts for theme:", error)
    return {
      success: false,
      error: "Error fetching posts: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

/**
 * Triggers the backend to generate posts for a theme
 * Used in generate-approve-content.tsx
 */
export async function triggerBackendPostGeneration(campaignId: number, themeId: number) {
  try {
    console.log(`Triggering backend post generation for campaign ${campaignId}, theme ${themeId}`)
    
    // Use an absolute URL constructed from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const apiUrl = new URL(`/api/copy/themes/${themeId}/generate_posts`, baseUrl);
    // Include campaignId as a query parameter
    apiUrl.searchParams.append('campaignId', campaignId.toString());
    // Set default count of posts to generate
    const count = 5;
    
    console.log(`Making API request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count }),
      // Prevent caching issues
      cache: "no-store",
    });

    if (!response.ok) {
      let errorMessage = `Failed to generate posts: ${response.status} ${response.statusText}`

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

      console.error("Error generating posts:", errorMessage)
      return {
        success: false,
        error: errorMessage,
      }
    }

    // Parse the successful response
    const result = await response.json()
    
    return {
      success: true,
      data: result.data || {},
    }
  } catch (error) {
    console.error("Error triggering post generation:", error)
    return {
      success: false,
      error: "Error generating posts: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Export the updatePostVideos function
export async function updatePostVideos(postsData: { id: number; video: string }[]) {
  try {
    console.log("Updating post videos:", postsData)

    const updatedPosts = []

    for (const post of postsData) {
      console.log(`Updating video for post ID ${post.id} with video: ${post.video}`)

      const [updatedPost] = await db
        .update(contentPosts)
        .set({ videoUrl: post.video }) // This is already correct - using videoUrl field
        .where(eq(contentPosts.id, post.id))
        .returning()

      console.log("Updated post:", updatedPost)
      updatedPosts.push(updatedPost)

      // Revalidate paths
      revalidatePath("/campaigns")
      revalidatePath(`/campaigns/${updatedPost.campaignId}`)
    }

    return { success: true, data: updatedPosts }
  } catch (error) {
    console.error("Failed to update post videos:", error)
    return {
      success: false,
      error: "Failed to update post videos: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Generate posts for a campaign
export async function generatePosts(campaignId: number, themeId: number, postsData: PostType[]) {
  try {
    console.log(`Deleting existing posts for campaign ${campaignId} and theme ${themeId}`)

    // First, delete all existing posts for this campaign and theme
    const deleteResult = await db
      .delete(contentPosts)
      .where(and(eq(contentPosts.campaignId, campaignId), eq(contentPosts.themeId, themeId)))

    console.log("Inserting new posts:", postsData.length)

    const postsToInsert: NewContentPost[] = postsData.map((post) => ({
      campaignId,
      themeId,
      title: post.content.substring(0, 50), // Use first 50 chars of content as title
      content: post.content,
      imageUrl: post.image,
      status: "approved",
    }))

    const insertedPosts = await db.insert(contentPosts).values(postsToInsert).returning()
    console.log("Inserted posts:", insertedPosts.length)

    // We're removing the campaign step update here since it's handled by the external API
    // The step update is now handled in the component after posts are generated

    return { success: true, data: insertedPosts }
  } catch (error) {
    console.error("Failed to generate posts:", error)
    return { success: false, error: "Failed to generate posts" }
  }
}

// Approve and disapprove posts
export async function approvePosts(approvedPostIds: number[], disapprovedPostIds: number[] = []) {
  try {
    console.log("Approving posts with IDs:", approvedPostIds)
    console.log("Disapproving posts with IDs:", disapprovedPostIds)

    const results = []

    // Update approved posts
    if (approvedPostIds.length > 0) {
      const approvedPosts = await db
        .update(contentPosts)
        .set({ status: "approved" })
        .where(inArray(contentPosts.id, approvedPostIds))
        .returning()

      results.push(...approvedPosts)
    }

    // Update disapproved posts
    if (disapprovedPostIds.length > 0) {
      const disapprovedPosts = await db
        .update(contentPosts)
        .set({ status: "disapproved" })
        .where(inArray(contentPosts.id, disapprovedPostIds))
        .returning()

      results.push(...disapprovedPosts)
    }

    // Get the campaign ID from the first post
    if (results.length > 0) {
      const campaignId = results[0].campaignId
      // Update campaign step to Generate Images (now 4 instead of 5)
      const CAMPAIGN_STEPS = await getCampaignSteps()
      await updateCampaignStep(campaignId, CAMPAIGN_STEPS.GENERATE_IMAGES)
    }

    return { success: true, data: results }
  } catch (error) {
    console.error("Failed to process posts:", error)
    return {
      success: false,
      error: "Failed to process posts: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Update post content
export async function updatePostContent(postId: number, content: string) {
  try {
    console.log("Updating post content for ID:", postId)

    const [updatedPost] = await db
      .update(contentPosts)
      .set({
        content,
        title: content.substring(0, 50), // Update title based on new content
      })
      .where(eq(contentPosts.id, postId))
      .returning()

    console.log("Updated post:", updatedPost)

    // Revalidate paths
    revalidatePath("/campaigns")
    revalidatePath(`/campaigns/${updatedPost.campaignId}`)

    return { success: true, data: updatedPost }
  } catch (error) {
    console.error("Failed to update post content:", error)
    return {
      success: false,
      error: "Failed to update post content: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Update post images
export async function updatePostImages(postsData: { id: number; image: string; imagesJson?: string }[]) {
  try {
    console.log("Updating post images:", postsData)

    const updatedPosts = []

    for (const post of postsData) {
      console.log(`Updating image for post ID ${post.id} with image: ${post.image}`)

      // Create update object with required fields
      const updateData: any = { imageUrl: post.image }

      // Add images JSON if provided
      if (post.imagesJson) {
        updateData.images = post.imagesJson
      }

      const [updatedPost] = await db
        .update(contentPosts)
        .set(updateData)
        .where(eq(contentPosts.id, post.id))
        .returning()

      console.log("Updated post:", updatedPost)
      updatedPosts.push(updatedPost)

      // Revalidate paths
      revalidatePath("/campaigns")
      revalidatePath(`/campaigns/${updatedPost.campaignId}`)
    }

    return { success: true, data: updatedPosts }
  } catch (error) {
    console.error("Failed to update post images:", error)
    return {
      success: false,
      error: "Failed to update post images: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Complete review step
export async function completeReview(campaignId: number) {
  try {
    // Update campaign step to Completion (now 7 instead of 8)
    const CAMPAIGN_STEPS = await getCampaignSteps()
    await updateCampaignStep(campaignId, CAMPAIGN_STEPS.COMPLETION)
    return { success: true }
  } catch (error) {
    console.error("Failed to complete review:", error)
    return {
      success: false,
      error: "Failed to complete review: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Schedule posts
export async function schedulePosts(postIds: number[]) {
  try {
    // Update posts to scheduled status and set scheduled date
    const updatedPosts = await db
      .update(contentPosts)
      .set({
        status: "scheduled",
        scheduledDate: new Date().toISOString(), // Set scheduled date to today as ISO string
      })
      .where(inArray(contentPosts.id, postIds))
      .returning()

    // Get the campaign ID from the first post
    if (updatedPosts.length > 0) {
      const campaignId = updatedPosts[0].campaignId
      // Update campaign step to Scheduled (now 8 instead of 9) and status to active
      const CAMPAIGN_STEPS = await getCampaignSteps()
      await updateCampaignStep(campaignId, CAMPAIGN_STEPS.SCHEDULED)
      await db.update(campaigns).set({ status: "active" }).where(eq(campaigns.id, campaignId))

      // Revalidate paths
      revalidatePath("/campaigns")
      revalidatePath(`/campaigns/${campaignId}`)
    }

    return { success: true, data: updatedPosts }
  } catch (error) {
    console.error("Failed to schedule posts:", error)
    return { success: false, error: "Failed to schedule posts" }
  }
}

// Get campaign by ID with related data
export async function getCampaign(id: number) {
  try {
    // First get the campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1)

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    // Get all themes for this campaign
    const allThemes = await db.select().from(themes).where(eq(themes.campaignId, id))

    // Get the selected theme
    const selectedTheme = allThemes.find((theme) => theme.isSelected)

    // Get all posts for this campaign
    const allPosts = await db.select().from(contentPosts).where(eq(contentPosts.campaignId, id))

    // Get approved posts
    const approvedPosts = allPosts.filter(
      (post) => post.status === "approved" || post.status === "scheduled" || post.status === "posted",
    )

    // Get posts with images (for step 5)
    const postsWithImages = approvedPosts.filter((post) => post.imageUrl && post.imageUrl.trim() !== "")

    // Get posts with videos (for step 6)
    const postsWithVideos = postsWithImages.filter((post) => post.videoUrl && post.videoUrl.trim() !== "")

    // Get disapproved posts
    const disapprovedPosts = allPosts.filter((post) => post.status === "disapproved")

    // Combine the data
    const campaignWithRelations = {
      ...campaign,
      allThemes,
      selectedTheme: selectedTheme || null,
      allPosts,
      approvedPosts,
      postsWithImages,
      postsWithVideos,
      disapprovedPosts,
    }

    return { success: true, data: campaignWithRelations }
  } catch (error) {
    console.error("Failed to get campaign:", error)
    return { success: false, error: "Failed to get campaign" }
  }
}

// Get all campaigns with status
export async function getAllCampaigns() {
  try {
    // Use standard select instead of query builder
    const allCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.id))

    // Determine UI status based on database status and currentStep
    const mappedCampaigns = allCampaigns.map(async (campaign) => {
      const CAMPAIGN_STEPS = await getCampaignSteps()

      // Map status for UI:
      // - "scheduled" for campaigns at step 8 (fully scheduled)
      // - "draft" for all other campaigns (in progress/incomplete)
      const uiStatus = campaign.currentStep === CAMPAIGN_STEPS.SCHEDULED ? "scheduled" : "draft"

      return {
        ...campaign,
        status: uiStatus,
        // Make sure isActive is included (default to true if not set)
        isActive: campaign.isActive !== undefined ? campaign.isActive : true,
      }
    })

    const resolvedCampaigns = await Promise.all(mappedCampaigns)

    return { success: true, data: resolvedCampaigns }
  } catch (error) {
    console.error("Failed to get campaigns:", error)
    return {
      success: false,
      error: "Failed to get campaigns: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Toggle campaign active status
export async function toggleCampaignActiveStatus(campaignId: number, isActive: boolean) {
  try {
    console.log(`Toggling campaign ${campaignId} active status to ${isActive}`)

    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        isActive: isActive,
      })
      .where(eq(campaigns.id, campaignId))
      .returning()

    // Revalidate both the campaigns list and the specific campaign page
    revalidatePath("/campaigns")
    revalidatePath(`/campaigns/${campaignId}`)

    return { success: true, data: updatedCampaign }
  } catch (error) {
    console.error("Failed to toggle campaign active status:", error)
    return {
      success: false,
      error: "Failed to toggle campaign active status: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Check theme status directly from the database
export async function checkThemeStatus(themeId: number) {
  try {
    console.log(`Checking theme status for theme ${themeId}`)

    // Get the theme from the database
    const [themeData] = await db.select().from(themes).where(eq(themes.id, themeId)).limit(1)

    if (!themeData) {
      return {
        success: false,
        error: "Theme not found",
      }
    }

    // Check if there are any posts for this theme
    const posts = await db.select().from(contentPosts).where(eq(contentPosts.themeId, themeId))

    // Determine if the theme is ready based on post_status or existing posts
    const isReady = themeData.post_status === "ready" || posts.length > 0

    return {
      success: true,
      data: {
        theme: themeData,
        status: themeData.post_status || "pending",
        posts: posts,
        isReady: isReady,
      },
    }
  } catch (error) {
    console.error("Failed to check theme status:", error)
    return {
      success: false,
      error: "Failed to check theme status: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Post to social media
export async function postToSocialMedia(postId: number, platform: string, content: string) {
  try {
    console.log(`Posting to ${platform} for post ID ${postId}`)

    // Call the API route - note we're not using content parameter anymore
    const baseUrl = process.env.NEXT_PUBLIC_URL || "localhost:3000"
    const protocol = baseUrl.includes("localhost") ? "http://" : "https://"
    const response = await fetch(`${protocol}${baseUrl}/api/social/${platform}/post`, {
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

// Complete video generation step
export async function completeVideoGeneration(campaignId: number) {
  try {
    // Update campaign step to Review (now 6 instead of 7)
    const CAMPAIGN_STEPS = await getCampaignSteps()
    await updateCampaignStep(campaignId, CAMPAIGN_STEPS.REVIEW)
    return { success: true }
  } catch (error) {
    console.error("Failed to complete video generation:", error)
    return {
      success: false,
      error: "Failed to complete video generation: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}
