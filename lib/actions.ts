"use server"

import { db, executeWithRetry } from "./db"
import { themes, contentPosts, campaigns } from "./schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { desc } from "drizzle-orm" // Add this import for getAllCampaigns
import { getCampaignSteps } from "./campaign-steps" // Import campaign steps
import { getOrCreateUser } from "./user-actions"
import { users } from "./schema"; // Thêm import cho bảng users

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

// Find the createCampaign function and modify it to trigger system prompt generation
// after creating the campaign but without awaiting its completion


export async function createCampaign(campaignData: any) {
  console.log("Creating campaign with data:", campaignData)

  try {
    // Validate required fields
    if (!campaignData.name || !campaignData.description) {
      return {
        success: false,
        error: "Missing required fields: name and description are required",
      }
    }

    // Lấy hoặc tạo user từ Clerk
    const userResult = await getOrCreateUser()
    if (!userResult.success || !userResult.data) {
      return {
        success: false,
        error: "Failed to get or create user",
      }
    }

    // Create campaign in database with user ID
    const campaign = await db
      .insert(campaigns)
      .values({
        userId: userResult.data.id,
        title: campaignData.name,
        description: campaignData.description,
        targetCustomer: campaignData.target,
        insight: campaignData.insight || null,
        content_type: campaignData.content_type || "Auto",
        repeatEveryDays: campaignData.repeatEveryDays || 7,
        startDate: campaignData.startDate ? new Date(campaignData.startDate).toISOString() : new Date().toISOString(),
        currentStep: 1, // Set to DRAFT step
        status: "draft",
        isActive: true,
        campaignData: null
      })
      .returning()

    if (!campaign || campaign.length === 0) {
      return {
        success: false,
        error: "Failed to create campaign",
      }
    }

    const newCampaign = campaign[0]
    console.log("Campaign created successfully:", newCampaign)

    // Trigger system prompt generation in the background without awaiting
    // This is the key change - we don't await this promise
    generateSystemPrompt(newCampaign)
      .then((result) => {
        if (result.success) {
          console.log("System prompt generated in background: Done") //, result.data
        } else {
          console.error("Background system prompt generation failed:", result.error)
        }
      })
      .catch((error) => {
        console.error("Error in background system prompt generation:", error)
      })

    revalidatePath("/campaigns")

    return {
      success: true,
      data: newCampaign,
    }
  } catch (error) {
    console.error("Error creating campaign:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
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

// Find the schedulePosts function and modify it to remove any image validation

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

// Revert the updatePostImages function to its original implementation
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
    
    // MODIFIED: Use approvedPosts for both postsWithImages and postsWithVideos
    // This ensures all approved posts flow through the workflow regardless of media content
    const postsWithImages = approvedPosts
    const postsWithVideos = approvedPosts

    // Log the counts for debugging
    console.log(`Campaign ${campaignId} data loaded:`)
    console.log(`- All posts: ${allPosts.length}`)
    console.log(`- Approved posts: ${approvedPosts.length}`)
    console.log(`- Posts with images (all approved): ${postsWithImages.length}`)
    console.log(`- Posts with videos (all approved): ${postsWithVideos.length}`)

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

// Hàm lấy cài đặt người dùng
export async function getUserPreferences() {
  try {
    const userResult = await getOrCreateUser();
    if (!userResult.success || !userResult.data) {
      return { success: false, error: "Unauthorized: Missing user ID." };
    }
    const userId = userResult.data.id;

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.length === 0) {
      return { success: false, error: "User not found." };
    }

    // Giả sử preferences là một đối tượng JSON hoặc null
    const preferences = user[0].preferences || {}; 
    return { success: true, data: preferences };

  } catch (error) {
    console.error("Failed to get user preferences:", error);
    return {
      success: false,
      error: "Failed to get user preferences: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}

// Hàm cập nhật cài đặt người dùng
export async function updateUserPreferences(newPreferences: any) {
  try {
    const userResult = await getOrCreateUser();
    if (!userResult.success || !userResult.data) {
      return { success: false, error: "Unauthorized: Missing user ID." };
    }
    const userId = userResult.data.id;

    // Lấy preferences hiện tại
    const currentUser = await db.select({ preferences: users.preferences }).from(users).where(eq(users.id, userId)).limit(1);
    const existingPreferences = currentUser[0]?.preferences || {};

    // Merge preferences mới vào preferences hiện tại
    const updatedPreferencesData = { ...existingPreferences, ...newPreferences };

    await db.update(users)
      .set({ preferences: updatedPreferencesData })
      .where(eq(users.id, userId));

    revalidatePath("/settings"); // Hoặc bất kỳ path nào cần revalidate
    return { success: true, data: updatedPreferencesData };

  } catch (error) {
    console.error("Failed to update user preferences:", error);
    return {
      success: false,
      error: "Failed to update user preferences: " + (error instanceof Error ? error.message : String(error)),
    };
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
export async function updateCampaign(campaignId: number, data: {
  name: string
  description: string
  target: string
  insight: string
}) {
  try {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        title: data.name,
        description: data.description,
        targetCustomer: data.target,
        insight: data.insight
      })
      .where(eq(campaigns.id, campaignId))
      .returning()

    revalidatePath(`/campaigns/${campaignId}`)
    return updatedCampaign
  } catch (error) {
    console.error('Failed to update campaign:', error)
    return null
  }
}

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
    //get user_id here
    const userResult = await getOrCreateUser();
    if (!userResult.success || !userResult.data) {
      return { success: false, error: "Unauthorized: Missing user ID." };
    }
    const userId = userResult.data.id;

    const allCampaigns = await db.select().from(campaigns).where(eq(campaigns.userId, userId)).orderBy(desc(campaigns.id));
    const mappedCampaigns = allCampaigns.map(async (campaign) => {
      const steps = await getCampaignSteps();
      const uiStatus = campaign.currentStep === steps.SCHEDULED ? "scheduled" : "draft";
      return {
        ...campaign,
        status: uiStatus,
        isActive: campaign.isActive !== undefined ? campaign.isActive : true,
      };
    });
    const resolvedCampaigns = await Promise.all(mappedCampaigns);
    return { success: true, data: resolvedCampaigns };
  } catch (error) {
    console.error("Failed to get campaigns:", error);
    return {
      success: false,
      error: "Failed to get campaigns: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}

function getBaseUrl() {
  let base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "http://localhost:3000"
  if (base.endsWith("/")) base = base.slice(0, -1)
  if (!base.startsWith("http")) base = `https://${base}`
  return base
}

export async function generateSystemPrompt(campaignInput: any) {
  try {
    console.log("📢 Generating system prompt for:", campaignInput?.id, campaignInput?.title)

    if (!campaignInput?.id || !campaignInput?.title || !campaignInput?.description) {
      console.error("❌ Missing required campaign fields:", campaignInput)
      return { success: false, error: "Missing required fields", details: campaignInput }
    }

    // Lấy access token và system prompt từ preferences của user
    const prefsResult = await getUserPreferences();
    let userAccessToken = process.env.OPENAI_API_KEY; // Fallback to env variable
    let userSystemPrompt = ""; // Default system prompt

    if (prefsResult.success && prefsResult.data) {
      if (prefsResult.data.openaiAccessToken) {
        userAccessToken = prefsResult.data.openaiAccessToken;
      }
      if (prefsResult.data.systemPrompt) {
        userSystemPrompt = prefsResult.data.systemPrompt;
      }
    }
    
    // Ghi log access token để debug, XÓA SAU KHI DEBUG XONG
    // console.log("🔑 Using OpenAI Access Token (first 5 chars):", userAccessToken ? userAccessToken.substring(0, 5) : "Not set");
    // console.log("📝 Using System Prompt:", userSystemPrompt);

    const apiUrl = `${getBaseUrl()}/api/campaigns/generate-system-prompt`
    console.log("🌐 Calling internal API:", apiUrl)

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignInput }),
      cache: "no-store",
    })

    const result = await response.json()
    console.log("✅ System prompt response:", result)

    return result
  } catch (error) {
    console.error("❌ Error in generateSystemPrompt:", error)
    return { success: false, error: "Unexpected error", details: String(error) }
  }
}
