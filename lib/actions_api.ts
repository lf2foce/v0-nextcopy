"use server"
import { db } from "./db"
import { themes, contentPosts } from "./schema"
import { eq } from "drizzle-orm"
import { updateCampaignStep, getCampaignSteps } from "./actions"
import type { Theme as ThemeType } from "@/types"
import type { Campaign as CampaignType } from "@/types"
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
        title: theme.name || "Untitled Theme",
        story: theme.description || "",
        isSelected: false,
        status: "pending" as const,
        post_status: "pending"
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
    
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const apiUrl = new URL('/api/copy/themes/generate', baseUrl).toString();
    
    console.log(`Making API request to: ${apiUrl}`);
    
    // Create a custom AbortController for a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
    
    let response: Response | undefined;
    let retries = 2;
    
    while (retries >= 0) {
      try {
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ campaignId }),
          signal: controller.signal,
          cache: 'no-store',
          next: { revalidate: 0 }
        });
        break;
      } catch (fetchError) {
        console.log(`API request attempt failed, ${retries} retries left`, fetchError);
        if (retries <= 0) throw new Error(`Failed to connect to external API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    clearTimeout(timeoutId);
    
    if (!response) {
      throw new Error("Failed to get response from API after multiple attempts");
    }

    if (!response.ok) {
      let errorMessage = `External API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = `${errorMessage} - ${errorText.substring(0, 100)}`;
          }
        } catch {
          // Use default error message
        }
      }
      throw new Error(errorMessage);
    }

    const apiResult = await response.json();
    console.log("API result received:", apiResult);

    let apiThemes;
    if (apiResult.success === false) {
      throw new Error(apiResult.error || "API returned unsuccessful response");
    } else if (apiResult.data) {
      apiThemes = apiResult.data;
    } else if (apiResult.themes) {
      apiThemes = apiResult.themes;
    } else if (Array.isArray(apiResult)) {
      apiThemes = apiResult;
    } else {
      apiThemes = apiResult;
    }

    return { success: true, data: apiThemes };
  } catch (error) {
    console.error("Failed to generate themes:", error);
    return {
      success: false,
      error: "Failed to generate themes: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}

// Select a theme for a campaign - updated to rely solely on external API
export async function selectTheme(themeId: number) {
  try {
    console.log(`Selecting theme ${themeId} via external API`)

    // Use an absolute URL constructed from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const apiUrl = new URL('/api/copy/themes/select', baseUrl).toString();
    
    console.log(`Making API request to: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ themeId }),
      // Prevent caching issues
      cache: "no-store",
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
    let posts: typeof contentPosts.$inferSelect[] = []
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
export async function generateImagesForPost(postId: number, numImages = 1, imageStyle = "realistic", imageService?: string) {
  try {
    console.log(`Generating ${numImages} images with style "${imageStyle}"${imageService ? ` using ${imageService}` : ''} for post ${postId}`)

    // Use an absolute URL constructed from environment variable
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const apiUrl = new URL(`/api/posts/${postId}/generate-images`, baseUrl);
    
    // Add query parameters
    apiUrl.searchParams.append('num_images', numImages.toString());
    apiUrl.searchParams.append('style', imageStyle);
    
    // Add image_service parameter if provided
    if (imageService) {
      apiUrl.searchParams.append('image_service', imageService);
    }
    
    console.log(`Making API request to: ${apiUrl.toString()}`);
    
    // Create a fetch request with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(apiUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        signal: controller.signal,
        cache: "no-store"
      });
      
      clearTimeout(timeoutId);
      
      // Clone the response for multiple reads
      const responseClone = response.clone();
      
      // Handle non-JSON responses better
      if (!response.ok) {
        let errorMessage = `Failed to generate images: ${response.status} ${response.statusText}`;
        let responseText = "";
        
        try {
          responseText = await response.text();
          console.log("Error response text:", responseText.substring(0, 500));
          
          try {
            // Try parsing as JSON if possible
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.detail || errorData.message || errorMessage;
          } catch (jsonError) {
            // Not valid JSON, use the text response
            if (responseText) {
              errorMessage = `${errorMessage} - ${responseText.substring(0, 100)}`;
            }
          }
        } catch (textError) {
          console.error("Failed to read error response as text:", textError);
        }
        
        console.error("Error generating images:", errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      // Try to get response as text first
      let responseText;
      try {
        responseText = await responseClone.text();
        
        // Check if the response is empty or not valid JSON
        if (!responseText.trim()) {
          return {
            success: false,
            error: "Empty response from server"
          };
        }
        
        console.log("Response text preview:", 
          responseText.length > 200 ? responseText.substring(0, 200) + "..." : responseText);
        
        // Check if the text contains indication of background processing
        if (responseText.includes("background") || responseText.includes("processing")) {
          return {
            success: true,
            data: {
              status: "processing",
              message: "Image generation started in background",
            },
          };
        }
        
        // Try to parse the response text as JSON
        const result = JSON.parse(responseText);
        console.log("API response for image generation:", result);
        
        // Check if this is a processing response (async generation started)
        if (result.data?.status === "processing") {
          return {
            success: true,
            data: {
              status: "processing",
              message: result.data.message || "Image generation started in background",
            },
          };
        }
        
        // If we have immediate results (unlikely but possible)
        if (result.data?.images && Array.isArray(result.data.images) && result.data.images.length > 0) {
          // Update the post with the new images
          try {
            const { updatePostImages } = await import("./actions");
            const imageData = result.data.images;
            
            const formattedData = {
              images: imageData.map((img: any, idx: number) => ({
                ...img,
                isSelected: true,
                order: idx,
              })),
            };
            
            await updatePostImages([
              {
                id: postId,
                image: imageData[0]?.url || "",
                imagesJson: JSON.stringify(formattedData),
              },
            ]);
          } catch (dbError) {
            console.error("Error updating post with new images:", dbError);
          }
        }
        
        return { success: true, data: result.data };
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        return {
          success: false,
          error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          responseText: responseText ? responseText.substring(0, 200) : "No text available"
        };
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error("Request timed out");
        return {
          success: false,
          error: "Request timed out after 30 seconds"
        };
      }
      throw fetchError; // Re-throw for outer catch block
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
    // Get the post and its images
    const [post] = await db
      .select()
      .from(contentPosts)
      .where(eq(contentPosts.id, postId))
      .limit(1);

    if (!post) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    // Parse images JSON if it exists
    let images = [];
    try {
      if (post.images) {
        const parsedImages = JSON.parse(post.images);
        // Handle different possible structures
        if (Array.isArray(parsedImages)) {
          images = parsedImages;
        } else if (parsedImages.images && Array.isArray(parsedImages.images)) {
          images = parsedImages.images;
        } else if (typeof parsedImages === 'object') {
          // If it's an object but not in expected format, try to convert to array
          images = Object.values(parsedImages).filter(item => 
            item && typeof item === 'object' && 'url' in item
          );
        }
      }
    } catch (e) {
      console.warn("Failed to parse images JSON:", e);
      images = [];
    }

    // Filter out any placeholder images for more accurate status reporting
    const realImages = Array.isArray(images) ? images.filter((img: any) => 
      img && typeof img === 'object' && 
      img.url && typeof img.url === 'string' && 
      !img.url.includes('placeholder.svg')
    ) : [];
    
    return {
      success: true,
      data: {
        status: post.image_status || "pending",
        isComplete: post.image_status === "completed",
        hasImages: realImages.length > 0,
        images: realImages.length > 0 ? realImages : images,
        imageUrl: post.imageUrl,
        updatedAt: post.createdAt || new Date(),
      },
    };
  } catch (error) {
    console.error("Failed to check image generation status:", error);
    return {
      success: false,
      error: "Failed to check image status: " + (error instanceof Error ? error.message : String(error)),
    };
  }
}
