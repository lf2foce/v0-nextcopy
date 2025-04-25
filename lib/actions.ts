"use server"

import { db, executeWithRetry } from "./db"
import { themes, contentPosts, campaigns } from "./schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

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

    if (postIds.length === 0) {
      console.log("No post IDs provided to schedule")
      return { success: true }
    }

    // Update each post to scheduled status
    for (const postId of postIds) {
      await db.update(contentPosts).set({ status: "scheduled" }).where(eq(contentPosts.id, postId))
    }

    // Get the campaign ID from the first post
    const [post] = await db.select().from(contentPosts).where(eq(contentPosts.id, postIds[0])).limit(1)

    if (post && post.campaignId) {
      // Update campaign step to SCHEDULED (8)
      console.log(`Updating campaign ${post.campaignId} to step 8 (SCHEDULED)`)

      // Get the steps
      const CAMPAIGN_STEPS = await getCampaignSteps()

      // Update the campaign status directly without using updateCampaignStep
      await db
        .update(campaigns)
        .set({
          currentStep: CAMPAIGN_STEPS.SCHEDULED,
          status: "active", // Always set status to active when scheduling
        })
        .where(eq(campaigns.id, post.campaignId))

      // Revalidate paths
      revalidatePath("/campaigns")
      revalidatePath(`/campaigns/${post.campaignId}`)
    }

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

// Generate posts
export async function generatePosts(campaignId: number, themeId: number, postsData: any[]) {
  try {
    console.log("Generating posts for theme:", themeId)

    revalidatePath("/campaigns")
    return { success: true, data: postsData }
  } catch (error) {
    console.error("Failed to generate posts:", error)
    return { success: false, error: "Failed to generate posts" }
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

    // Update campaign step to Completion (now 7 instead of 8)
    const CAMPAIGN_STEPS = await getCampaignSteps()
    await updateCampaignStep(campaignId, CAMPAIGN_STEPS.COMPLETION)

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to complete review:", error)
    return {
      success: false,
      error: "Failed to complete review: " + (error instanceof Error ? error.message : String(error)),
    }
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

    // Consider posts with either imageUrl or images JSON as having images
    const postsWithImages = allPosts.filter((post) => {
      // Check for imageUrl
      if (post.imageUrl && post.imageUrl !== "/placeholder.svg") return true

      // Check for images in JSON
      if (post.images) {
        try {
          const imagesData = JSON.parse(post.images)
          const images = imagesData.images?.images || imagesData.images || []
          return images.some(
            (img: any) =>
              img.isSelected && img.url && !img.url.includes("placeholder.svg") && !img.url.startsWith("blob:"),
          )
        } catch (e) {
          console.error("Error parsing images JSON:", e)
        }
      }

      return false
    })

    // Ensure all posts have videoUrl property (even if it's just a placeholder)
    const postsWithVideosAndImages = postsWithImages.map((post) => ({
      ...post,
      videoUrl: post.videoUrl || "/placeholder.mp4",
    }))

    return {
      success: true,
      data: {
        ...campaign,
        allThemes,
        selectedTheme,
        allPosts,
        approvedPosts,
        postsWithImages: postsWithVideosAndImages,
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

// Add this function to the end of the file

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

async function updateCampaignStep(campaignId: number, step: number) {
  try {
    await db.update(campaigns).set({ currentStep: step }).where(eq(campaigns.id, campaignId))
    revalidatePath(`/campaigns/${campaignId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to update campaign step:", error)
    return { success: false, error: "Failed to update campaign step" }
  }
}
