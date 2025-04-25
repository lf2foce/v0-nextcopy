"use server"

import { db, executeWithRetry } from "./db"
import { themes, contentPosts, campaigns } from "./schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

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

// Create a new campaign
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

// Approve posts
export async function approvePosts(approvedPostIds: number[], disapprovedPostIds: number[] = []) {
  try {
    console.log("Approving posts with IDs:", approvedPostIds)
    console.log("Disapproving posts with IDs:", disapprovedPostIds)

    // Update approved posts
    if (approvedPostIds.length > 0) {
      await db.update(contentPosts).set({ status: "approved" }).where(eq(contentPosts.id, approvedPostIds[0])) // Fix: Use eq for single ID
    }

    // Update disapproved posts
    if (disapprovedPostIds.length > 0) {
      await db.update(contentPosts).set({ status: "disapproved" }).where(eq(contentPosts.id, disapprovedPostIds[0])) // Fix: Use eq for single ID
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

    // Update posts to scheduled status
    await db.update(contentPosts).set({ status: "scheduled" }).where(eq(contentPosts.id, postIds[0])) // Fix: Use eq for single ID

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to schedule posts:", error)
    return { success: false, error: "Failed to schedule posts" }
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

// Update the generateThemes function to remove any fallbacks
export async function generateThemes(campaignId: number) {
  try {
    // Call the API directly without any fallbacks
    const response = await fetch(`/api/themes/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ campaignId }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate themes: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || "API returned unsuccessful response")
    }

    return {
      success: true,
      data: data.themes || data.data,
    }
  } catch (error) {
    console.error("Failed to generate themes:", error)
    return {
      success: false,
      error: "Failed to generate themes: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

export async function selectTheme() {
  return {
    success: false,
    error: "selectTheme is not implemented",
  }
}

// Update campaign step
export async function updateCampaignStep(campaignId: number, step: number) {
  try {
    console.log(`Updating campaign ${campaignId} to step ${step}`)

    // Update both currentStep and status if needed
    let status = "draft"
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
