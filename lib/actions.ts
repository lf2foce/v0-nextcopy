"use server"

import { db, executeWithRetry } from "./db"
import { themes, contentPosts, campaigns } from "./schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { desc } from "drizzle-orm" // Add this import for getAllCampaigns
import { getCampaignSteps } from "./campaign-steps" // Import campaign steps

// Define campaign steps
const CAMPAIGN_STEPS = {
  DRAFT: 1,
  THEME_SELECTION: 2,
  CONTENT_CREATION: 3,
  IMAGE_SELECTION: 4,
  VIDEO_SELECTION: 5,
  SCHEDULING: 6,
  REVIEW: 7,
  SCHEDULED: 8,
}

// Create a new campaign - without system prompt generation
export async function createCampaign(formData: any) {
  try {
    console.log("Creating new campaign with data:", formData)

    // Map form data fields to database schema fields
    const campaignData = {
      title: formData.name,
      description: formData.description,
      targetCustomer: formData.target,
      insight: formData.insight,
      repeatEveryDays: formData.repeatEveryDays,
      startDate: formData.startDate,
      currentStep: 0,
      status: "draft",
      isActive: true,
    }

    // Insert the new campaign into the database with retry logic
    const [newCampaign] = await executeWithRetry(() => db.insert(campaigns).values(campaignData).returning())

    console.log("Campaign created successfully:", newCampaign)

    // No system prompt generation here - moved to frontend

    revalidatePath("/campaigns")

    return {
      success: true,
      data: newCampaign,
    }
  } catch (error) {
    console.error("Failed to create campaign:", error)
    return {
      success: false,
      error: "Failed to create campaign: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Update the approvePosts function to handle multiple post IDs correctly

export async function approvePosts(approvedPostIds: number[], disapprovedPostIds: number[] = []) {
  try {
    console.log("Approving posts with IDs:", approvedPostIds)
    console.log("Disapproving posts with IDs:", disapprovedPostIds)

    // Update approved posts - handle multiple IDs
    if (approvedPostIds.length > 0) {
      for (const postId of approvedPostIds) {
        await db.update(contentPosts).set({ status: "approved" }).where(eq(contentPosts.id, postId))
      }
    }

    // Update disapproved posts - handle multiple IDs
    if (disapprovedPostIds.length > 0) {
      for (const postId of disapprovedPostIds) {
        await db.update(contentPosts).set({ status: "disapproved" }).where(eq(contentPosts.id, postId))
      }
    }

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to approve posts:", error)
    return { success: false, error: "Failed to approve posts" }
  }
}

// Update post content
export async function updatePostContent(postId: number, content: string) {
  try {
    console.log(`Updating post ${postId} with new content`)

    await db.update(contentPosts).set({ content: content }).where(eq(contentPosts.id, postId))

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to update post content:", error)
    return { success: false, error: "Failed to update post content" }
  }
}

// Schedule posts
export async function schedulePosts(postIds: number[]) {
  try {
    console.log("Scheduling posts with IDs:", postIds)

    // Get the campaign ID from the first post
    if (postIds.length > 0) {
      // Use standard Drizzle query instead of query API
      const posts = await db
        .select({ campaignId: contentPosts.campaignId })
        .from(contentPosts)
        .where(eq(contentPosts.id, postIds[0]))
        .limit(1)

      const post = posts[0]

      if (post && post.campaignId) {
        // Update the campaign to step 8 (SCHEDULED) and status to "active"
        await db
          .update(campaigns)
          .set({
            currentStep: 8, // SCHEDULED step
            status: "active",
          })
          .where(eq(campaigns.id, post.campaignId))

        // Revalidate the campaign page
        revalidatePath(`/campaigns/${post.campaignId}`)
      }
    }

    // Update posts to scheduled status
    for (const postId of postIds) {
      await db.update(contentPosts).set({ status: "scheduled" }).where(eq(contentPosts.id, postId))
    }

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to schedule posts:", error)
    return {
      success: false,
      error: "Failed to schedule posts: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Fetch posts for a theme
export async function fetchPostsForTheme(campaignId: number, themeId: number) {
  try {
    console.log(`Fetching posts for theme ${themeId} in campaign ${campaignId}`)

    const posts = await db.select().from(contentPosts).where(eq(contentPosts.themeId, themeId))

    return { success: true, data: posts }
  } catch (error) {
    console.error("Failed to fetch posts for theme:", error)
    return { success: false, error: "Failed to fetch posts for theme" }
  }
}

// Update post images
export async function updatePostImages(postsToUpdate: { id: number; image: string }[]) {
  try {
    console.log("Updating post images:", postsToUpdate)

    for (const post of postsToUpdate) {
      await db.update(contentPosts).set({ imageUrl: post.image }).where(eq(contentPosts.id, post.id))
    }

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to update post images:", error)
    return { success: false, error: "Failed to update post images" }
  }
}

// Update post videos
export async function updatePostVideos(postsToUpdate: { id: number; video: string }[]) {
  try {
    console.log("Updating post videos:", postsToUpdate)

    for (const post of postsToUpdate) {
      await db.update(contentPosts).set({ videoUrl: post.video }).where(eq(contentPosts.id, post.id))
    }

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to update post videos:", error)
    return { success: false, error: "Failed to update post videos" }
  }
}

// Complete review
export async function completeReview(campaignId: number) {
  try {
    console.log("Completing review for campaign:", campaignId)

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to complete review:", error)
    return { success: false, error: "Failed to complete review" }
  }
}

// Enhance getCampaign to include retry logic internally
export async function getCampaign(campaignId: number) {
  try {
    console.log(`Getting campaign with id: ${campaignId}`)

    // Use Promise.all with retry logic to fetch all data in parallel
    const [campaign, allThemes, allPosts] = await executeWithRetry(() =>
      Promise.all([
        db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignId))
          .then((res) => res[0]),
        db.select().from(themes).where(eq(themes.campaignId, campaignId)),
        db.select().from(contentPosts).where(eq(contentPosts.campaignId, campaignId)),
      ]),
    )

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    // Process data after fetching
    const selectedTheme = allThemes.find((theme) => theme.isSelected)
    const approvedPosts = allPosts.filter((post) => post.status === "approved")
    const postsWithImages = allPosts.filter((post) => post.imageUrl)
    const postsWithVideos = allPosts.filter((post) => post.videoUrl)

    return {
      success: true,
      data: {
        ...campaign,
        allThemes,
        selectedTheme,
        allPosts,
        approvedPosts,
        postsWithImages,
        postsWithVideos,
      },
    }
  } catch (error) {
    console.error("Failed to get campaign:", error)
    return {
      success: false,
      error: "Failed to get campaign: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Toggle campaign active status
export async function toggleCampaignActiveStatus(campaignId: number, isActive: boolean) {
  try {
    console.log(`Toggling campaign ${campaignId} active status to ${isActive}`)

    await db.update(campaigns).set({ isActive: isActive }).where(eq(campaigns.id, campaignId))

    revalidatePath("/campaigns")
    revalidatePath(`/campaigns/${campaignId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to toggle campaign active status:", error)
    return { success: false, error: "Failed to toggle campaign active status" }
  }
}

// Enhance getCampaignWithStep to include retry logic internally
export async function getCampaignWithStep(campaignId: number) {
  try {
    console.log(`Getting campaign with id: ${campaignId}`)

    // Use a more efficient query with retry logic
    const [campaign] = await executeWithRetry(() =>
      db
        .select({
          id: campaigns.id,
          title: campaigns.title,
          description: campaigns.description,
          currentStep: campaigns.currentStep,
          status: campaigns.status,
          isActive: campaigns.isActive,
          targetCustomer: campaigns.targetCustomer,
          insight: campaigns.insight,
          repeatEveryDays: campaigns.repeatEveryDays,
          startDate: campaigns.startDate,
        })
        .from(campaigns)
        .where(eq(campaigns.id, campaignId)),
    )

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    return { success: true, data: campaign }
  } catch (error) {
    console.error("Failed to get campaign:", error)
    return {
      success: false,
      error: "Failed to get campaign: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Update campaign step
export async function updateCampaignStep(campaignId: number, step: number) {
  try {
    console.log(`Updating campaign ${campaignId} to step ${step}`)

    // Update both currentStep and status if needed
    let status = "draft"
    if (step === 8) {
      // Use hardcoded value instead of CAMPAIGN_STEPS.SCHEDULED
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

// Get all campaigns with status - moved from actions_api.ts
export async function getAllCampaigns() {
  try {
    // Use standard select instead of query builder
    const allCampaigns = await db.select().from(campaigns).orderBy(desc(campaigns.id))

    // Determine UI status based on database status and currentStep
    const mappedCampaigns = allCampaigns.map(async (campaign) => {
      // Map status for UI:
      // - "scheduled" for campaigns at step 8 (fully scheduled)
      // - "draft" for all other campaigns (in progress/incomplete)
      const steps = await getCampaignSteps()
      const uiStatus = campaign.currentStep === steps.SCHEDULED ? "scheduled" : "draft"

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

// These are placeholder implementations for functions that are actually implemented in actions_api.ts
export async function generateThemes(campaignId: number) {
  return {
    success: false,
    error: "generateThemes is not implemented in actions.ts, use the version from actions_api.ts",
  }
}

export async function selectTheme(themeId: number) {
  return {
    success: false,
    error: "selectTheme is not implemented in actions.ts, use the version from actions_api.ts",
  }
}

// Add this new server action at the end of the file

// Generate system prompt for a campaign
export async function generateSystemPrompt(campaignData: any) {
  try {
    console.log("Generating system prompt for campaign:", campaignData.id, campaignData.title)

    // Validate campaign data
    if (!campaignData || !campaignData.id) {
      console.error("Invalid campaign data:", campaignData)
      return {
        success: false,
        error: "Invalid campaign data: Missing required fields",
        details: { campaignData },
      }
    }

    // Get the base URL for API calls
    // Get the base URL for API calls - ensure it's properly formatted
    // In browser environments like v0 preview, we can use relative URLs
    const isServerEnvironment = typeof window === "undefined"
    let apiUrl

    if (isServerEnvironment) {
      // Server-side: construct full URL
      let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000"

      // Ensure the URL doesn't have a trailing slash
      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1)
      }

      // Ensure the URL has http:// or https:// prefix
      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`
      }

      apiUrl = `${baseUrl}/api/campaigns/generate-system-prompt`
    } else {
      // Client-side: use relative URL
      apiUrl = "/api/campaigns/generate-system-prompt"
    }

    console.log("Using API URL for system prompt generation:", apiUrl)

    // Call the API route to generate the system prompt
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignData }),
        cache: "no-store", // Ensure we're not getting a cached response
      })

      // Log response status
      console.log("API response status:", response.status)

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Could not read error response body")
        console.error("API error response:", response.status, errorText)

        return {
          success: false,
          error: `API error (${response.status}): ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            body: errorText.substring(0, 500), // Limit error text length
          },
        }
      }

      // Parse the JSON response
      let result
      try {
        result = await response.json()
      } catch (parseError) {
        console.error("Failed to parse API response as JSON:", parseError)
        return {
          success: false,
          error: "Failed to parse API response as JSON",
          details: { parseError: parseError instanceof Error ? parseError.message : String(parseError) },
        }
      }

      // Check if the result indicates success
      if (!result.success) {
        console.error("API returned error:", result.error)
        return {
          success: false,
          error: `API returned error: ${result.error || "Unknown error"}`,
          details: result,
        }
      }

      // Validate the result data
      if (!result.data) {
        console.error("API response missing data:", result)
        return {
          success: false,
          error: "API response missing data",
          details: result,
        }
      }

      // Update the campaign with the generated system prompt data
      try {
        await db
          .update(campaigns)
          .set({
            campaignData: JSON.stringify(result.data),
          })
          .where(eq(campaigns.id, campaignData.id))

        console.log("System prompt data saved successfully for campaign:", campaignData.id)
      } catch (dbError) {
        console.error("Database error when saving campaign data:", dbError)
        return {
          success: false,
          error: "Failed to save system prompt data to database",
          details: { dbError: dbError instanceof Error ? dbError.message : String(dbError) },
        }
      }

      return {
        success: true,
        data: result.data,
      }
    } catch (fetchError) {
      console.error("Fetch error when calling API:", fetchError)
      return {
        success: false,
        error: "Network error when generating system prompt",
        details: { fetchError: fetchError instanceof Error ? fetchError.message : String(fetchError) },
      }
    }
  } catch (error) {
    console.error("Unexpected error in generateSystemPrompt:", error)
    return {
      success: false,
      error: "Unexpected error in generateSystemPrompt",
      details: { error: error instanceof Error ? error.stack : String(error) },
    }
  }
}
