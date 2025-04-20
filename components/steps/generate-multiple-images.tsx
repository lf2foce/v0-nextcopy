"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import type { Post } from "../campaign-workflow"
import { CheckCircle, RefreshCw, Loader2, Check, AlertCircle, MinusCircle, PlusCircle, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { checkImageGenerationStatus } from "@/lib/actions_api"

// Define the image object structure
interface PostImage {
  url: string
  prompt: string
  order: number
  isSelected: boolean
  metadata?: {
    width: number
    height: string
    style: string
  }
}

// Define available image styles
const IMAGE_STYLES = [
  { value: "realistic", label: "Realistic" },
  { value: "cartoon", label: "Cartoon" },
  { value: "illustration", label: "Illustration" },
  { value: "watercolor", label: "Watercolor" },
  { value: "sketch", label: "Sketch" },
  { value: "3d_render", label: "3D Render" },
  { value: "pixel_art", label: "Pixel Art" },
  { value: "oil_painting", label: "Oil Painting" },
]

interface GenerateMultipleImagesProps {
  posts: Post[]
  onComplete: (posts: Post[]) => void
  onBack: () => void
  allowMissingImages?: boolean // New prop to control whether images are required
}

export default function GenerateMultipleImages({
  posts,
  onComplete,
  onBack,
  allowMissingImages = true,
}: GenerateMultipleImagesProps) {
  const [localPosts, setLocalPosts] = useState<Post[]>(posts)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingPostId, setGeneratingPostId] = useState<string | number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string | number, string>>({})
  const [pollingPosts, setPollingPosts] = useState<Record<string | number, boolean>>({})
  const [pollingTimers, setPollingTimers] = useState<Record<string | number, NodeJS.Timeout>>({})
  // Add state for number of images per post
  const [numImagesPerPost, setNumImagesPerPost] = useState<Record<string | number, number>>({})
  // Add state for image style per post
  const [imageStylePerPost, setImageStylePerPost] = useState<Record<string | number, string>>({})
  // Add state for dropdown visibility
  const [openDropdowns, setOpenDropdowns] = useState<Record<string | number, boolean>>({})
  // Add state to track which posts have completed image generation
  const [completedPosts, setCompletedPosts] = useState<Record<string | number, boolean>>({})
  // Add a refresh counter to force re-renders
  const [refreshCounter, setRefreshCounter] = useState(0)
  const { toast } = useToast()

  // Create refs for dropdowns
  const dropdownRefs = useRef<Record<string | number, HTMLDivElement | null>>({})

  // Create a ref to store the current localPosts state for use in polling callbacks
  const localPostsRef = useRef<Post[]>(localPosts)

  // Update the ref whenever localPosts changes
  useEffect(() => {
    localPostsRef.current = localPosts
  }, [localPosts])

  // Initialize numImagesPerPost and imageStylePerPost with default values
  useEffect(() => {
    const initialNumImages: Record<string | number, number> = {}
    const initialImageStyles: Record<string | number, string> = {}
    posts.forEach((post) => {
      initialNumImages[post.id] = 1 // Default to 1 image per post
      initialImageStyles[post.id] = "realistic" // Default to realistic style
    })
    setNumImagesPerPost(initialNumImages)
    setImageStylePerPost(initialImageStyles)
  }, [posts])

  // Function to increment number of images
  const incrementNumImages = (postId: string | number) => {
    setNumImagesPerPost((prev) => ({
      ...prev,
      [postId]: Math.min((prev[postId] || 1) + 1, 10), // Max 10 images
    }))
  }

  // Function to decrement number of images
  const decrementNumImages = (postId: string | number) => {
    setNumImagesPerPost((prev) => ({
      ...prev,
      [postId]: Math.max((prev[postId] || 1) - 1, 1), // Min 1 image
    }))
  }

  // Function to toggle dropdown
  const toggleDropdown = (postId: string | number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling
    setOpenDropdowns((prev) => {
      const newState = { ...prev }
      // Close all other dropdowns
      Object.keys(newState).forEach((key) => {
        if (key !== String(postId)) newState[key] = false
      })
      // Toggle this dropdown
      newState[postId] = !prev[postId]
      return newState
    })
  }

  // Function to close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let shouldCloseAll = true

      // Check if the click was inside any dropdown
      Object.entries(dropdownRefs.current).forEach(([postId, ref]) => {
        if (ref && ref.contains(event.target as Node)) {
          shouldCloseAll = false
        }
      })

      if (shouldCloseAll) {
        setOpenDropdowns({})
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Function to select image style
  const selectImageStyle = (postId: string | number, style: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the click from closing the dropdown immediately
    setImageStylePerPost((prev) => ({
      ...prev,
      [postId]: style,
    }))
    // Close the dropdown after selection
    setOpenDropdowns((prev) => ({
      ...prev,
      [postId]: false,
    }))
  }

  // Function to force a UI refresh
  const forceUIRefresh = useCallback(() => {
    console.log("Forcing UI refresh")
    setRefreshCounter((prev) => prev + 1)
  }, [])

  // Function to update a specific post with new images
  const updatePostWithImages = useCallback(
    (postId: number, images: any[]) => {
      console.log(`Updating post ${postId} with ${images.length} images`)

      // Format the data properly for our component
      const formattedData = {
        images: images.map((img, idx) => ({
          ...img,
          isSelected: true, // Mark all as selected by default
          order: idx,
        })),
      }

      // Update the local posts array with the new images - COMPLETELY REPLACE old images
      setLocalPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              images: JSON.stringify(formattedData), // This completely replaces old images
              imageUrl: images[0]?.url || post.imageUrl,
            }
          }
          return post
        })
      })

      // Mark this post as completed
      setCompletedPosts((prev) => ({
        ...prev,
        [postId]: true,
      }))

      // Clear any errors for this post
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[postId]
        return newErrors
      })

      // Force a UI refresh after updating the post
      forceUIRefresh()

      // Also save to database immediately to ensure persistence
      if (typeof postId === "number") {
        // Use setTimeout to avoid blocking the UI update
        setTimeout(async () => {
          try {
            const { updatePostImages } = await import("@/lib/actions")
            await updatePostImages([
              {
                id: postId,
                image: images[0]?.url || "",
                imagesJson: JSON.stringify(formattedData), // Save the complete replacement
              },
            ])
            console.log("Successfully saved new images to database for post:", postId)
          } catch (error) {
            console.error("Error saving new images to database:", error)
          }
        }, 0)
      }
    },
    [forceUIRefresh],
  )

  // Completely rewritten polling function to ensure each post updates independently
  const startPolling = useCallback(
    (postId: number) => {
      console.log(`Starting polling for post ${postId}`)

      // Mark this post as being polled
      setPollingPosts((prev) => ({
        ...prev,
        [postId]: true,
      }))

      // Clear any existing timer for this post
      if (pollingTimers[postId]) {
        clearInterval(pollingTimers[postId])
      }

      let attempts = 0
      const MAX_ATTEMPTS = 30 // About 2 minutes with 4-second intervals

      // Create a new polling interval
      const timerId = setInterval(async () => {
        attempts++

        try {
          console.log(`Polling attempt ${attempts} for post ${postId}`)
          const result = await checkImageGenerationStatus(postId)

          if (result.success) {
            // If we have images or the status is complete
            if (result.data.hasImages || result.data.isComplete) {
              console.log(`Images ready for post ${postId}:`, result.data.images)

              // Stop polling
              clearInterval(pollingTimers[postId])

              // Update polling state
              setPollingPosts((prev) => {
                const newState = { ...prev }
                delete newState[postId]
                return newState
              })

              setPollingTimers((prev) => {
                const newState = { ...prev }
                delete newState[postId]
                return newState
              })

              // Update the post with images
              if (result.data.images && result.data.images.length > 0) {
                updatePostWithImages(postId, result.data.images)

                // Show success toast
                toast({
                  title: "Images ready",
                  description: `Images for post ${postId} have been generated successfully.`,
                })
              } else {
                console.warn(`No images found for post ${postId} even though status is complete`)

                // Try one more direct fetch to get images
                try {
                  const directResult = await checkImageGenerationStatus(postId)
                  if (directResult.success && directResult.data.images && directResult.data.images.length > 0) {
                    updatePostWithImages(postId, directResult.data.images)
                  }
                } catch (e) {
                  console.error("Error in final fetch attempt:", e)
                }
              }

              // Force a UI refresh after polling completes
              forceUIRefresh()
            } else if (attempts >= MAX_ATTEMPTS) {
              // Stop polling after max attempts
              clearInterval(pollingTimers[postId])

              setPollingPosts((prev) => {
                const newState = { ...prev }
                delete newState[postId]
                return newState
              })

              setPollingTimers((prev) => {
                const newState = { ...prev }
                delete newState[postId]
                return newState
              })

              setErrors((prev) => ({
                ...prev,
                [postId]: "Timed out waiting for images",
              }))

              toast({
                title: "Generation timeout",
                description: `Timed out waiting for images for post ${postId}`,
                variant: "destructive",
              })

              // Force a UI refresh after error
              forceUIRefresh()
            }
          } else if (attempts >= MAX_ATTEMPTS) {
            // Stop polling after max attempts on error
            clearInterval(pollingTimers[postId])

            setPollingPosts((prev) => {
              const newState = { ...prev }
              delete newState[postId]
              return newState
            })

            setPollingTimers((prev) => {
              const newState = { ...prev }
              delete newState[postId]
              return newState
            })

            setErrors((prev) => ({
              ...prev,
              [postId]: result.error || "Failed to check image status",
            }))

            // Force a UI refresh after error
            forceUIRefresh()
          }
        } catch (error) {
          console.error(`Error polling for post ${postId}:`, error)

          if (attempts >= MAX_ATTEMPTS) {
            // Stop polling after max attempts on exception
            clearInterval(pollingTimers[postId])

            setPollingPosts((prev) => {
              const newState = { ...prev }
              delete newState[postId]
              return newState
            })

            setPollingTimers((prev) => {
              const newState = { ...prev }
              delete newState[postId]
              return newState
            })

            setErrors((prev) => ({
              ...prev,
              [postId]: "Error checking image status",
            }))

            // Force a UI refresh after error
            forceUIRefresh()
          }
        }
      }, 4000) // Poll every 4 seconds

      // Save the timer ID
      setPollingTimers((prev) => ({
        ...prev,
        [postId]: timerId,
      }))

      // Return cleanup function
      return () => {
        clearInterval(timerId)
      }
    },
    [pollingTimers, toast, updatePostWithImages, forceUIRefresh],
  )

  // Clean up polling timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingTimers).forEach((timerId) => {
        clearInterval(timerId)
      })
    }
  }, [pollingTimers])

  // Add an effect to check all polling posts periodically
  useEffect(() => {
    // If there are any posts being polled, set up a periodic refresh
    if (Object.keys(pollingPosts).length > 0) {
      const refreshTimer = setInterval(() => {
        // Check all posts that are being polled
        Object.keys(pollingPosts).forEach(async (postIdStr) => {
          const postId = Number(postIdStr)
          if (!isNaN(postId)) {
            try {
              console.log(`Auto-checking status for post ${postId}`)
              const result = await checkImageGenerationStatus(postId)

              if (result.success && result.data.hasImages && result.data.images?.length > 0) {
                console.log(`Found images for post ${postId} during auto-refresh`)
                updatePostWithImages(postId, result.data.images)
                
                // Also save to database immediately to ensure persistence
                try {
                  const { updatePostImages } = await import("@/lib/actions")
                  const formattedData = {
                    images: result.data.images.map((img: any, idx: number) => ({
                      ...img,
                      isSelected: true, // Mark all as selected by default
                      order: idx,
                    })),
                  }
                  
                  await updatePostImages([
                    {
                      id: postId,
                      image: result.data.images[0]?.url || "",
                      imagesJson: JSON.stringify(formattedData),
                    },
                  ])
                  console.log("Successfully saved auto-refreshed images to database for post:", postId)
                } catch (error) {
                  console.error("Error saving auto-refreshed images to database:", error)
                }

                // Stop polling for this post
                if (pollingTimers[postId]) {
                  clearInterval(pollingTimers[postId])

                  setPollingPosts((prev) => {
                    const newState = { ...prev }
                    delete newState[postId]
                    return newState
                  })

                  setPollingTimers((prev) => {
                    const newState = { ...prev }
                    delete newState[postId]
                    return newState
                  })
                }
              }
            } catch (e) {
              console.error(`Error checking status for post ${postId} during auto-refresh:`, e)
            }
          }
        })

        // Force a UI refresh
        forceUIRefresh()
      }, 1500) // Check even more frequently (every 1.5 seconds) for better UX

      return () => clearInterval(refreshTimer)
    }
  }, [pollingPosts, pollingTimers, updatePostWithImages, forceUIRefresh])

  // Function to generate placeholder images for a post
  const generatePlaceholderImages = (postId: string | number): PostImage[] => {
    const imageStyles = ["photorealistic", "artistic", "cartoon", "sketch", "abstract"]
    const images: PostImage[] = []

    for (let i = 0; i < 1; i++) {
      // Default to 1 placeholder image
      const style = imageStyles[i % imageStyles.length]

      images.push({
        url: `/placeholder.svg?height=300&width=400&text=Placeholder_${style}`,
        prompt: `Placeholder image ${i + 1} for post ${postId}`,
        order: i,
        isSelected: false,
        metadata: {
          width: 400,
          height: 300,
          style: style,
        },
      })
    }

    return images
  }

  // Parse images from JSON string
  const getPostImages = (post: Post): PostImage[] => {
    if (!post.images) return []

    try {
      const imagesData = JSON.parse(post.images)
      // Handle both direct images array and nested images structure
      return imagesData.images?.images || imagesData.images || []
    } catch (e) {
      console.error("Error parsing images JSON:", e)
      return []
    }
  }

  // Check if a post has real images (not placeholders)
  const hasRealImages = (post: Post): boolean => {
    const images = getPostImages(post)
    if (images.length === 0) return false

    // Check if any image URL is not a placeholder
    return images.some((img) => !img.url.includes("placeholder.svg"))
  }

  // Initialize posts with placeholder images if they don't have images
  useEffect(() => {
    // Initialize posts with the provided posts to preserve selection state
    const updatedPosts = posts.map((post) => {
      // If the post already has images with selection state, keep it
      if (post.images && hasRealImages(post)) {
        return post
      }

      // Otherwise add placeholder images
      const placeholderImages = generatePlaceholderImages(post.id)
      return {
        ...post,
        images: JSON.stringify({ images: placeholderImages }),
      }
    })

    setLocalPosts(updatedPosts)
  }, [posts]) // Add posts as dependency to update when posts change

  // Core function to generate images for a post - used by both regenerate and generate all
  const generateImagesForPost = async (postId: string | number) => {
    // Clear any previous errors for this post
    setErrors((prev) => ({ ...prev, [postId]: "" }))

    try {
      // Only call the API if it's a real post with a numeric ID
      if (typeof postId === "number") {
        // Import the generateImagesForPost function from actions_api
        const { generateImagesForPost } = await import("@/lib/actions_api")

        // Get the number of images and style to generate for this post
        const numImages = numImagesPerPost[postId] || 1
        const imageStyle = imageStylePerPost[postId] || "realistic"

        console.log(`Generating ${numImages} images with style "${imageStyle}" for post ${postId}`)

        // Skip if this post is already being polled
        if (pollingPosts[postId]) {
          console.log(`Post ${postId} is already being polled, skipping generation`)
          return { success: true, status: "already_polling" }
        }

        // Call the actual API to generate images with the number of images and style
        const result = await generateImagesForPost(postId, numImages, imageStyle)

        if (!result.success) {
          const errorMessage = result.error || "Failed to generate images from API"
          console.error("Failed to generate images:", errorMessage)
          toast({
            title: "Error",
            description: `Error for post ${postId}: ${errorMessage}`,
            variant: "destructive",
          })
          // Store the error for this specific post
          setErrors((prev) => ({ ...prev, [postId]: errorMessage }))
          return { success: false, error: errorMessage }
        }

        // Check if this is a processing response (async generation started)
        if (result.data?.status === "processing") {
          toast({
            title: "Generating images",
            description: `Generating ${numImages} ${imageStyle} style images for post ${postId}. This may take a minute...`,
          })

          // Start polling for this post
          startPolling(postId)
          return { success: true, status: "processing" }
        }

        // If we have immediate results (unlikely but possible)
        if (result.data?.images && Array.isArray(result.data.images) && result.data.images.length > 0) {
          // Update the post with the new images
          updatePostWithImages(postId, result.data.images)

          toast({
            title: "Images generated",
            description: `New images have been generated for post ${postId}.`,
          })

          return { success: true, status: "completed", images: result.data.images }
        } else {
          // If no immediate images but not an error, start polling
          if (result.success) {
            toast({
              title: "Generating images",
              description: `Generating ${numImages} ${imageStyle} style images for post ${postId}. This may take a minute...`,
            })

            // Start polling for this post
            startPolling(postId)
            return { success: true, status: "processing" }
          } else {
            const errorMessage = "API returned no image data"
            console.error(errorMessage)
            toast({
              title: "Error",
              description: `${errorMessage} for post ${postId}`,
              variant: "destructive",
            })
            // Store the error for this specific post
            setErrors((prev) => ({ ...prev, [postId]: errorMessage }))
            return { success: false, error: errorMessage }
          }
        }
      } else {
        // For non-numeric IDs, show an error
        const errorMessage = "Cannot generate images for posts without a valid ID"
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        // Store the error for this specific post
        setErrors((prev) => ({ ...prev, [postId]: errorMessage }))
        return { success: false, error: errorMessage }
      }
    } catch (error) {
      const errorMessage = "Failed to generate images: " + (error instanceof Error ? error.message : String(error))
      console.error("Error generating images:", error)
      toast({
        title: "Error",
        description: `${errorMessage} for post ${postId}`,
        variant: "destructive",
      })
      // Store the error for this specific post
      setErrors((prev) => ({ ...prev, [postId]: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }

  // Function to handle regenerating images for a single post
  const handleRegenerateImages = async (postId: string | number) => {
    setGeneratingPostId(postId)

    // Remove from completed posts if it was previously completed
    setCompletedPosts((prev) => {
      const newState = { ...prev }
      delete newState[postId]
      return newState
    })

    // Clear any existing images for this post before regenerating
    if (typeof postId === "number") {
      // Clear the images in local state first for immediate UI feedback
      setLocalPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (post.id === postId) {
            // Generate a placeholder while waiting for new images
            const placeholderImages = generatePlaceholderImages(post.id)
            return {
              ...post,
              images: JSON.stringify({ images: placeholderImages }),
            }
          }
          return post
        })
      })

      // Also clear images in the database to ensure they're completely replaced
      try {
        const { updatePostImages } = await import("@/lib/actions")
        const placeholderImages = generatePlaceholderImages(postId)
        await updatePostImages([
          {
            id: postId,
            image: "",
            imagesJson: JSON.stringify({ images: placeholderImages }),
          },
        ])
      } catch (error) {
        console.error("Error clearing images in database:", error)
      }
    }

    await generateImagesForPost(postId)
    setGeneratingPostId(null)
  }

  // Function to handle generating images for all posts
  const handleGenerateAllImages = async () => {
    setIsGenerating(true)
    // Clear all errors
    setErrors({})
    // Clear completed posts
    setCompletedPosts({})

    try {
      const postsToProcess = [...localPosts]
      let successCount = 0
      let processingCount = 0
      let errorCount = 0
      let skippedCount = 0

      // Process posts one by one
      for (let i = 0; i < postsToProcess.length; i++) {
        const post = postsToProcess[i]

        // Skip posts that are already being polled
        if (pollingPosts[post.id]) {
          console.log(`Skipping post ${post.id} as it's already being polled`)
          skippedCount++
          continue
        }

        setGeneratingPostId(post.id)

        // Generate images for this post
        const result = await generateImagesForPost(post.id)

        if (result.success) {
          if (result.status === "processing") {
            processingCount++
          } else if (result.status === "already_polling") {
            skippedCount++
          } else {
            successCount++
          }
        } else {
          errorCount++
        }

        // Add a small delay between requests to avoid overwhelming the API
        if (i < postsToProcess.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      // Show summary toast
      if (errorCount > 0) {
        toast({
          title: "Some images failed to generate",
          description: `${errorCount} out of ${postsToProcess.length} posts had errors.`,
          variant: "destructive",
        })
      } else if (processingCount > 0) {
        toast({
          title: "Generating images",
          description: `Started image generation for ${processingCount} posts. This may take a minute...`,
        })
      } else {
        toast({
          title: "Images generated",
          description: `Generated images for ${successCount} posts. Skipped ${skippedCount} posts.`,
        })
      }

      // Force a UI refresh
      forceUIRefresh()
    } catch (error) {
      console.error("Error generating all images:", error)
      toast({
        title: "Error",
        description: "Failed to generate all images: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setGeneratingPostId(null)
    }
  }

  // Function to manually refresh the UI
  const manualForceUIRefresh = async () => {
    console.log("Manually forcing UI refresh")

    // Clear any cached state
    setRefreshCounter((prev) => prev + 1)

    // Check all posts that are being polled
    const pollingPromises = Object.keys(pollingPosts).map(async (postIdStr) => {
      const postId = Number(postIdStr)
      if (!isNaN(postId)) {
        try {
          console.log(`Manually checking status for post ${postId}`)
          const result = await checkImageGenerationStatus(postId)

          if (result.success && result.data.hasImages && result.data.images?.length > 0) {
            console.log(`Found images for post ${postId} during manual refresh`)
            updatePostWithImages(postId, result.data.images)

            // Stop polling for this post
            if (pollingTimers[postId]) {
              clearInterval(pollingTimers[postId])

              setPollingPosts((prev) => {
                const newState = { ...prev }
                delete newState[postId]
                return newState
              })

              setPollingTimers((prev) => {
                const newState = { ...prev }
                delete newState[postId]
                return newState
              })
            }
          }
        } catch (e) {
          console.error(`Error checking status for post ${postId} during manual refresh:`, e)
        }
      }
    })

    // Wait for all polling checks to complete
    await Promise.all(pollingPromises)

    // Refresh all posts from database to ensure we have the latest data
    try {
      // Refresh all posts from database
      for (const post of localPosts) {
        if (typeof post.id === "number") {
          const result = await checkImageGenerationStatus(post.id)
          if (result.success && result.data.hasImages && result.data.images?.length > 0) {
            // Update with the latest images from database
            updatePostWithImages(post.id, result.data.images)
          }
        }
      }

      toast({
        title: "UI Refreshed",
        description: "All post images have been refreshed from the database.",
      })
    } catch (error) {
      console.error("Error refreshing posts from database:", error)
      toast({
        title: "Error",
        description: "Failed to refresh some posts from database",
        variant: "destructive",
      })
    }

    // Force a UI refresh
    forceUIRefresh()
  }

  // Function to toggle image selection and save to database immediately
  const toggleImageSelection = async (postId: string | number, imageIndex: number) => {
    // Update local state first for immediate UI feedback
    setLocalPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => {
        if (post.id === postId && post.images) {
          try {
            const imagesData = JSON.parse(post.images)
            const images = imagesData.images?.images || imagesData.images || []

            const updatedImages = images.map((img: PostImage, idx: number) => ({
              ...img,
              isSelected: idx === imageIndex ? !img.isSelected : img.isSelected,
            }))

            // Update the post's main imageUrl if needed
            let newImageUrl = post.imageUrl

            // If we're toggling this image ON, make it the main image
            if (updatedImages[imageIndex].isSelected) {
              newImageUrl = updatedImages[imageIndex].url
            }
            // If we're toggling this image OFF and it was the main image, find another selected image
            else if (post.imageUrl === images[imageIndex].url) {
              const firstSelectedImage = updatedImages.find((img: PostImage) => img.isSelected)
              newImageUrl = firstSelectedImage ? firstSelectedImage.url : post.imageUrl
            }

            // Create the updated images structure
            const updatedImagesData = {
              ...imagesData,
              images: updatedImages,
            }

            return {
              ...post,
              images: JSON.stringify(updatedImagesData),
              imageUrl: newImageUrl,
            }
          } catch (e) {
            console.error("Error parsing images JSON:", e)
            return post
          }
        }
        return post
      })

      // After updating local state, trigger database update
      const updatedPost = updatedPosts.find((p) => p.id === postId)
      if (updatedPost && typeof postId === "number") {
        // Use setTimeout to avoid blocking the UI update
        setTimeout(() => saveImageSelectionToDatabase(postId, updatedPost), 0)
      }

      return updatedPosts
    })
  }

  // Helper function to save image selection to database
  const saveImageSelectionToDatabase = async (postId: number, post: Post) => {
    try {
      if (!post.images) return

      const imagesData = JSON.parse(post.images)
      const images = imagesData.images?.images || imagesData.images || []
      const selectedImages = images.filter((img: PostImage) => img.isSelected)

      // Get the first selected image as the main image, or use the current one if none selected
      const mainImageUrl = selectedImages.length > 0 ? selectedImages[0].url : post.imageUrl

      // Import the updatePostImages function
      const { updatePostImages } = await import("@/lib/actions")

      // Save to database - this includes both selected AND unselected images
      const result = await updatePostImages([
        {
          id: postId,
          image: mainImageUrl,
          imagesJson: post.images, // This contains the full updated selection state
        },
      ])

      if (result.success) {
        console.log("Successfully saved image selection to database for post:", postId)
      } else {
        console.error("Failed to save image selection to database:", result.error)
        toast({
          title: "Warning",
          description: "Failed to save selection to database",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving image selection to database:", error)
      toast({
        title: "Warning",
        description: "Failed to save selection to database",
        variant: "destructive",
      })
    }
  }

  // Function to handle completion
  const handleComplete = async () => {
    setIsSubmitting(true)

    try {
      // Only save selections to database if we have real images (not placeholders)
      for (const post of localPosts) {
        if (typeof post.id === "number" && post.images) {
          try {
            const imagesData = JSON.parse(post.images)
            const images = imagesData.images?.images || imagesData.images || []
            const selectedImages = images.filter((img: PostImage) => img.isSelected)

            // Only save to database if there are selected images AND they're not placeholders
            if (selectedImages.length > 0 && !selectedImages[0].url.includes("placeholder.svg")) {
              const { updatePostImages } = await import("@/lib/actions")

              // Get the first selected image as the main image
              const mainImageUrl = selectedImages[0].url

              await updatePostImages([
                {
                  id: post.id,
                  image: mainImageUrl,
                  imagesJson: JSON.stringify(imagesData),
                },
              ])
            } else {
              console.log("Skipping database update for post with placeholder images:", post.id)
            }
          } catch (e) {
            console.error("Error saving final image selection:", e)
          }
        }
      }

      // Call the onComplete callback with the updated posts
      onComplete(localPosts)
    } catch (error) {
      console.error("Error completing image generation:", error)
      toast({
        title: "Error",
        description: "Failed to save generated images",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get selected images count for a post
  const getSelectedImagesCount = (post: Post): number => {
    const images = getPostImages(post)
    return images.filter((img) => img.isSelected).length
  }

  // Check if any posts are currently being polled
  const isAnyPostPolling = Object.values(pollingPosts).some((value) => value === true)

  // Add error handling and retry logic for 504 errors
  useEffect(() => {
    // Check for 504 errors and retry
    Object.entries(errors).forEach(([postId, errorMsg]) => {
      if (errorMsg.includes("504") && typeof Number(postId) === "number") {
        console.log(`Detected 504 error for post ${postId}, will retry in 5 seconds`)

        // Clear the error
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[postId]
          return newErrors
        })

        // Retry after 5 seconds
        const retryTimer = setTimeout(() => {
          console.log(`Retrying image generation for post ${postId} after 504 error`)
          handleRegenerateImages(Number(postId))
        }, 5000)

        return () => clearTimeout(retryTimer)
      }
    })
  }, [errors])

  // Update the rendering part to show polling status and style dropdown
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Generate Images</h2>
        <p className="text-gray-700">Generate and select images for your posts</p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm">
          <span className="font-bold">{localPosts.length}</span> posts to generate images for
        </p>
        <div className="flex gap-2">
          <button
            onClick={manualForceUIRefresh}
            className="py-2 px-4 bg-blue-400 border-2 border-black rounded-md font-medium hover:bg-blue-500"
          >
            Refresh UI
          </button>
          <button
            onClick={handleGenerateAllImages}
            disabled={isGenerating || isSubmitting}
            className="py-2 px-4 bg-purple-400 border-2 border-black rounded-md font-medium hover:bg-purple-500 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Generate All Images
              </>
            )}
          </button>
        </div>
      </div>

      {allowMissingImages && localPosts.some((post) => getSelectedImagesCount(post) === 0) && (
        <div className="bg-yellow-100 border-2 border-yellow-400 rounded-md p-3 mb-4">
          <p className="text-sm font-medium flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-yellow-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Some posts don't have selected images. You can continue, but you may want to add images later.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {localPosts.map((post, index) => {
          const isGeneratingThisPost = generatingPostId === post.id
          const isPollingThisPost = pollingPosts[post.id] === true
          const postImages = getPostImages(post)
          const hasImages = postImages.length > 0
          const selectedCount = getSelectedImagesCount(post)
          const hasGeneratedImages = hasRealImages(post)
          const hasError = errors[post.id]
          const numImages = numImagesPerPost[post.id] || 1
          const imageStyle = imageStylePerPost[post.id] || "realistic"
          const isDropdownOpen = openDropdowns[post.id] || false
          const isGeneratingOrPolling = isGeneratingThisPost || isPollingThisPost
          const isCompleted = completedPosts[post.id] === true

          return (
            <div
              key={`${post.id}-${refreshCounter}`}
              className="border-4 border-black rounded-md overflow-hidden bg-white"
            >
              <div className="p-4 bg-yellow-100 border-b-4 border-black flex justify-between items-center">
                <h3 className="font-bold text-lg">Post {index + 1}</h3>
                <div className="flex items-center gap-4">
                  {hasGeneratedImages && (
                    <span className="text-sm font-medium">
                      {selectedCount} of {postImages.length} selected
                    </span>
                  )}

                  {/* Image generation controls */}
                  <div className="flex items-center gap-2">
                    {/* Number of images selector */}
                    <div className="flex items-center gap-2 bg-white border-2 border-black rounded-md px-2 py-1">
                      <button
                        onClick={() => decrementNumImages(post.id)}
                        disabled={numImages <= 1 || isGeneratingOrPolling}
                        className="text-black hover:text-gray-700 disabled:opacity-50"
                      >
                        <MinusCircle size={16} />
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{numImages}</span>
                      <button
                        onClick={() => incrementNumImages(post.id)}
                        disabled={numImages >= 10 || isGeneratingOrPolling}
                        className="text-black hover:text-gray-700 disabled:opacity-50"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>

                    {/* Style selector dropdown */}
                    <div className="relative" ref={(el) => (dropdownRefs.current[post.id] = el)}>
                      <button
                        onClick={(e) => toggleDropdown(post.id, e)}
                        disabled={isGeneratingOrPolling}
                        className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1 text-sm w-32 disabled:opacity-50"
                      >
                        <span>{IMAGE_STYLES.find((style) => style.value === imageStyle)?.label || "Realistic"}</span>
                        <ChevronDown size={14} className={isDropdownOpen ? "transform rotate-180" : ""} />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-40 bg-white border-2 border-black rounded-md shadow-lg">
                          {IMAGE_STYLES.map((style) => (
                            <button
                              key={style.value}
                              onClick={(e) => selectImageStyle(post.id, style.value, e)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                imageStyle === style.value ? "bg-yellow-100 font-medium" : ""
                              }`}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRegenerateImages(post.id)}
                      disabled={isGeneratingOrPolling || isSubmitting}
                      className="py-1 px-3 bg-purple-300 border-2 border-black rounded-md hover:bg-purple-400 flex items-center gap-1 text-sm disabled:opacity-50"
                    >
                      {isGeneratingOrPolling ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {isPollingThisPost ? "Generating..." : "Regenerating..."}
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          {hasGeneratedImages ? "Regenerate Images" : "Generate Images"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <p className="text-lg mb-4 line-clamp-2">{post.content}</p>

                {isGeneratingOrPolling ? (
                  <div className="h-64 flex flex-col items-center justify-center bg-gray-50 border-2 border-gray-300 border-dashed rounded-lg">
                    <Loader2 size={32} className="animate-spin text-black mb-2" />
                    <span className="font-medium">
                      Generating {numImages}{" "}
                      {IMAGE_STYLES.find((style) => style.value === imageStyle)?.label || "Realistic"} style image
                      {numImages > 1 ? "s" : ""}...
                    </span>
                    {isPollingThisPost && (
                      <p className="text-sm text-gray-500 mt-2">This may take a minute. Please wait...</p>
                    )}
                  </div>
                ) : hasError ? (
                  <div className="h-64 flex flex-col items-center justify-center bg-red-50 border-2 border-red-300 border-dashed rounded-lg p-4">
                    <AlertCircle size={32} className="text-red-500 mb-2" />
                    <p className="font-medium text-red-700 text-center">Error generating images</p>
                    <p className="text-sm text-red-600 text-center mt-2">{hasError}</p>
                  </div>
                ) : hasGeneratedImages ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {postImages.map((image, imageIndex) => (
                        <div
                          key={imageIndex}
                          onClick={() => toggleImageSelection(post.id, imageIndex)}
                          className={`relative border-4 ${
                            image.isSelected ? "border-green-500" : "border-black"
                          } rounded-md overflow-hidden h-40 cursor-pointer`}
                        >
                          <Image
                            src={image.url || "/placeholder.svg"}
                            alt={`Image ${imageIndex + 1} for post ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                          <div
                            className={`absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center rounded-full ${
                              image.isSelected ? "bg-green-500 text-white" : "bg-white border-2 border-black"
                            }`}
                          >
                            {image.isSelected && <Check size={16} />}
                          </div>
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            Style: {image.metadata?.style || imageStyle || "default"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">Click on an image to select or deselect it.</p>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center bg-gray-50 border-2 border-gray-300 border-dashed rounded-lg">
                    <span className="ml-2 font-medium">No images generated yet.</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="py-3 px-6 bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300 disabled:opacity-50"
        >
          Back
        </button>
        {!allowMissingImages || localPosts.every((post) => getSelectedImagesCount(post) > 0) ? (
          <button
            onClick={handleComplete}
            disabled={isSubmitting || isAnyPostPolling}
            className="py-3 px-6 bg-green-500 border-2 border-black rounded-md font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : isAnyPostPolling ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Waiting for images...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Complete
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={isSubmitting || isAnyPostPolling}
            className="py-3 px-6 bg-yellow-500 border-2 border-black rounded-md font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : isAnyPostPolling ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Waiting for images...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Complete Anyway
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
