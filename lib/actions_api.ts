// Add a new function to handle API requests with retry logic

// Add this helper function at the top of the file
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3) {
  let retries = 0

  while (retries < maxRetries) {
    try {
      const response = await fetch(url, options)

      // If we get a rate limit error (429), wait and retry
      if (response.status === 429) {
        retries++
        console.log(`Rate limited (429). Retry attempt ${retries} of ${maxRetries}`)

        // Get retry-after header or use exponential backoff
        const retryAfter = response.headers.get("Retry-After")
        const delayMs = retryAfter ? Number.parseInt(retryAfter) * 1000 : Math.pow(2, retries) * 1000

        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      // For other non-200 responses, try to parse error message
      if (!response.ok) {
        const contentType = response.headers.get("Content-Type") || ""

        if (contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error ${response.status}`)
        } else {
          // Handle text responses (like "Too Many Requests")
          const errorText = await response.text()
          throw new Error(`HTTP error ${response.status}: ${errorText.substring(0, 100)}`)
        }
      }

      // Success case - try to parse as JSON
      const contentType = response.headers.get("Content-Type") || ""
      if (contentType.includes("application/json")) {
        return await response.json()
      } else {
        // Handle non-JSON successful responses
        const text = await response.text()
        try {
          // Try to parse as JSON anyway in case Content-Type is wrong
          return JSON.parse(text)
        } catch (e) {
          // Return as text if not JSON
          return { text }
        }
      }
    } catch (error) {
      retries++

      // If it's the last retry, throw the error
      if (retries >= maxRetries) {
        throw error
      }

      // Otherwise wait and retry
      console.log(`Request failed. Retry attempt ${retries} of ${maxRetries}:`, error)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000))
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`)
}

export async function generateImagesForPost(
  postId: number,
  numImages = 1,
  imageStyle = "realistic",
  imageService = "ideogram",
) {
  try {
    const apiUrl = `/api/posts/${postId}/generate-images?num_images=${numImages}&style=${encodeURIComponent(imageStyle)}&image_service=${encodeURIComponent(imageService)}`

    console.log(`Calling API endpoint: ${apiUrl}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { detail: errorText }
      }

      console.error(`Error response (${response.status}):`, errorData)

      // Check if this is a service error
      if (response.status === 500 && errorData.serviceError) {
        return {
          success: false,
          error: errorData.error || `Service error: ${imageService} is currently unavailable`,
          serviceError: true,
          service: imageService,
        }
      }

      return {
        success: false,
        error: errorData.detail || `API error: ${response.status} ${response.statusText}`,
      }
    }

    const data = await response.json()
    console.log("API response data:", data)

    // Handle processing status
    if (data.data?.status === "processing") {
      return { success: true, data: data.data }
    }

    if (!data.data?.images && !data.images) {
      return { success: false, error: "No images were returned from API" }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Network error in generateImagesForPost:", error)
    if (error.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out after 30 seconds",
        serviceError: true,
        service: imageService,
      }
    }
    return { success: false, error: `Network error: ${error.message}` }
  }
}

export async function checkImageGenerationStatus(postId: number) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const response = await fetch(`/api/posts/${postId}/image-generation-status`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error("Error checking image generation status:", response.statusText)
      return {
        success: false,
        error: `Failed to check status: ${response.status} ${response.statusText}`,
        status: "error",
      }
    }

    const data = await response.json()
    return {
      success: true,
      status: data.status,
      message: data.message,
      data: data,
    }
  } catch (error) {
    console.error("Error checking image generation status:", error)
    if (error.name === "AbortError") {
      return {
        success: false,
        error: "Request timed out after 15 seconds",
        status: "error",
      }
    }
    return {
      success: false,
      error: `Network error: ${error.message}`,
      status: "error",
    }
  }
}

// Update the checkThemePostStatus function to use fetchWithRetry
export async function checkThemePostStatus(themeId: number) {
  try {
    console.log(`Checking theme post status for theme ${themeId}`)

    // Use the new fetchWithRetry function
    const data = await fetchWithRetry(`/api/copy/themes/${themeId}/status`)

    return {
      success: true,
      data: {
        isReady: data.data?.post_status === "ready" || false,
        posts: data.data?.posts || [],
      },
    }
  } catch (error) {
    console.error("Failed to check theme post status:", error)
    return {
      success: false,
      error: "Failed to check theme post status: " + (error instanceof Error ? error.message : String(error)),
    }
  }
}

// Find the generateThemes function and fix the error where 'e' is being treated as a function
// Add this function if it doesn't exist or fix it if it does

export async function generateThemes(campaignId: number, themesData?: any[]) {
  try {
    console.log(`Generating themes for campaign ${campaignId}`)

    // If themesData is provided, use it directly
    if (themesData && Array.isArray(themesData)) {
      console.log(`Using provided themes data: ${themesData.length} themes`)

      // Make sure we're working with the database
      const { db } = await import("./db")
      const { themes } = await import("./schema")

      // First, check if themes already exist for this campaign
      const existingThemes = await db.query.themes.findMany({
        where: (theme, { eq }) => eq(theme.campaignId, campaignId),
      })

      if (existingThemes.length > 0) {
        console.log(`Found ${existingThemes.length} existing themes for campaign ${campaignId}`)
        return { success: true, data: existingThemes }
      }

      // Insert the provided themes into the database
      const insertedThemes = await db
        .insert(themes)
        .values(
          themesData.map((theme) => ({
            campaignId,
            title: theme.name || theme.title || "Theme",
            story: theme.description || theme.story || "",
            isSelected: false,
            status: "pending",
            post_status: "pending",
          })),
        )
        .returning()

      console.log(`Inserted ${insertedThemes.length} themes into database`)
      return { success: true, data: insertedThemes }
    }

    // If no themesData provided, try to call the external API
    try {
      const response = await fetch(`/api/copy/themes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error from themes API: ${response.status} ${response.statusText}`, errorText)
        return {
          success: false,
          error: `Failed to generate themes: ${response.status} ${response.statusText}`,
        }
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error calling themes API:", error)

      // Generate mock themes as fallback
      const mockThemes = [
        {
          campaignId,
          title: "Bold & Vibrant",
          story: "High contrast colors with bold typography for maximum impact",
          isSelected: false,
          status: "pending",
          post_status: "pending",
        },
        {
          campaignId,
          title: "Minimalist",
          story: "Clean, simple designs with plenty of white space",
          isSelected: false,
          status: "pending",
          post_status: "pending",
        },
        {
          campaignId,
          title: "Retro Wave",
          story: "80s inspired neon colors and geometric patterns",
          isSelected: false,
          status: "pending",
          post_status: "pending",
        },
      ]

      // Try to insert mock themes into database
      try {
        const { db } = await import("./db")
        const { themes } = await import("./schema")

        const insertedThemes = await db.insert(themes).values(mockThemes).returning()

        return {
          success: true,
          data: insertedThemes,
          warning: "Used fallback themes due to API error",
        }
      } catch (dbError) {
        console.error("Database error when inserting fallback themes:", dbError)
        return {
          success: true,
          data: mockThemes,
          warning: "Using mock themes (not saved to database)",
        }
      }
    }
  } catch (error) {
    console.error("Error in generateThemes:", error)
    return {
      success: false,
      error: `Failed to generate themes: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Add or fix the selectTheme function to prevent "e is not a function" error

export async function selectTheme(themeId: number) {
  try {
    console.log(`Selecting theme ${themeId}`)

    // Call the external API
    try {
      const response = await fetch(`/api/copy/themes/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ themeId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Error from theme selection API: ${response.status} ${response.statusText}`, errorText)

        // If API fails, try to update the database directly
        return await updateThemeSelectionInDatabase(themeId)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error calling theme selection API:", error)

      // If API call fails, update the database directly
      return await updateThemeSelectionInDatabase(themeId)
    }
  } catch (error) {
    console.error("Error in selectTheme:", error)
    return {
      success: false,
      error: `Failed to select theme: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// Helper function to update theme selection in database
async function updateThemeSelectionInDatabase(themeId: number) {
  try {
    const { db } = await import("./db")
    const { themes } = await import("./schema")
    const { eq } = await import("drizzle-orm")

    // Get the theme to find its campaignId
    const [theme] = await db.select().from(themes).where(eq(themes.id, themeId)).limit(1)

    if (!theme) {
      return { success: false, error: "Theme not found" }
    }

    // Reset all themes for this campaign to not selected
    await db
      .update(themes)
      .set({ isSelected: false, status: "discarded" })
      .where(eq(themes.campaignId, theme.campaignId))

    // Set the selected theme
    const [updatedTheme] = await db
      .update(themes)
      .set({ isSelected: true, status: "selected" })
      .where(eq(themes.id, themeId))
      .returning()

    return {
      success: true,
      data: updatedTheme,
      message: "Theme selected successfully (database update)",
    }
  } catch (dbError) {
    console.error("Database error when selecting theme:", dbError)
    return {
      success: false,
      error: `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
    }
  }
}
