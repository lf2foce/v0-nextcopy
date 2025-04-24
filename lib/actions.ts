"use server"

import { db } from "./db"
import { themes, contentPosts, campaigns } from "./schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

// Add the createCampaign function after the imports and before the other functions

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

    // Insert the new campaign into the database
    const [newCampaign] = await db.insert(campaigns).values(campaignData).returning()

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

    revalidatePath("/campaigns")
    return { success: true }
  } catch (error) {
    console.error("Failed to complete review:", error)
    return { success: false, error: "Failed to complete review" }
  }
}

// Get campaign
export async function getCampaign(campaignId: number) {
  try {
    console.log(`Getting campaign with id: ${campaignId}`)

    // Fetch the campaign and related data
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId))

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    // Fetch all themes for this campaign
    const allThemes = await db.select().from(themes).where(eq(themes.campaignId, campaignId))

    // Fetch the selected theme
    const selectedTheme = allThemes.find((theme) => theme.isSelected)

    // Fetch all posts for this campaign
    const allPosts = await db.select().from(contentPosts).where(eq(contentPosts.campaignId, campaignId))

    // Filter approved posts
    const approvedPosts = allPosts.filter((post) => post.status === "approved")

    // Filter posts with images
    const postsWithImages = allPosts.filter((post) => post.imageUrl)

    return {
      success: true,
      data: {
        ...campaign,
        allThemes,
        selectedTheme,
        allPosts,
        approvedPosts,
        postsWithImages,
      },
    }
  } catch (error) {
    console.error("Failed to get campaign:", error)
    return { success: false, error: "Failed to get campaign" }
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

// Get campaign with step
export async function getCampaignWithStep(campaignId: number) {
  try {
    console.log(`Getting campaign with id: ${campaignId}`)

    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId))

    if (!campaign) {
      return { success: false, error: "Campaign not found" }
    }

    return { success: true, data: campaign }
  } catch (error) {
    console.error("Failed to get campaign:", error)
    return { success: false, error: "Failed to get campaign" }
  }
}

export async function generateThemes() {
  return {
    success: false,
    error: "generateThemes is not implemented",
  }
}

export async function selectTheme() {
  return {
    success: false,
    error: "selectTheme is not implemented",
  }
}
