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

// Define available image services
const IMAGE_SERVICES = [
  { value: "ideogram", label: "Ideogram" },
  { value: "gemini", label: "Gemini" },
  { value: "flux", label: "Flux" },
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
  // Add state for image service per post - sử dụng mảng string để lưu nhiều dịch vụ
  const [imageServicePerPost, setImageServicePerPost] = useState<Record<string | number, string[]>>({})
  // Add state for dropdown visibility
  const [openDropdowns, setOpenDropdowns] = useState<Record<string | number, boolean>>({})
  // Add state for service dropdown visibility
  const [openServiceDropdowns, setOpenServiceDropdowns] = useState<Record<string | number, boolean>>({})
  // Add state for global service selection dropdown
  const [globalServiceDropdownOpen, setGlobalServiceDropdownOpen] = useState(false)
  // Add state for selected global service
  const [globalSelectedService, setGlobalSelectedService] = useState<string>("ideogram")
  // Add state for global style selection dropdown
  const [globalStyleDropdownOpen, setGlobalStyleDropdownOpen] = useState(false)
  // Add state for selected global style
  const [globalSelectedStyle, setGlobalSelectedStyle] = useState<string>("realistic")
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
    const initialImageServices: Record<string | number, string[]> = {}
    posts.forEach((post) => {
      initialNumImages[post.id] = 1 // Default to 1 image per post
      initialImageStyles[post.id] = "realistic" // Default to realistic style
      initialImageServices[post.id] = ["ideogram"] // Default to Ideogram service
    })
    setNumImagesPerPost(initialNumImages)
    setImageStylePerPost(initialImageStyles)
    setImageServicePerPost(initialImageServices)
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

  // Function to toggle service dropdown
  const toggleServiceDropdown = (postId: string | number, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent event bubbling
    setOpenServiceDropdowns((prev) => {
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

  // Function to select image service
  const selectImageService = (postId: string | number, service: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent the click from closing the dropdown immediately
    
    // Cập nhật dịch vụ cho bài đăng này
    setImageServicePerPost((prev) => ({
      ...prev,
      [postId]: [service] // Chọn một dịch vụ duy nhất
    }))
    
    // Đóng dropdown sau khi chọn
    setOpenServiceDropdowns((prev) => ({
      ...prev,
      [postId]: false,
    }))
  }

  // Function to toggle global service dropdown
  const toggleGlobalServiceDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setGlobalServiceDropdownOpen(prev => !prev)
  }
  
  // Function to select global service and apply to all posts
  const selectGlobalService = (service: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setGlobalSelectedService(service)
    
    // Áp dụng dịch vụ này cho tất cả các bài đăng
    const updatedServices: Record<string | number, string[]> = {}
    posts.forEach(post => {
      updatedServices[post.id] = [service]
    })
    setImageServicePerPost(updatedServices)
    
    // Đóng dropdown
    setGlobalServiceDropdownOpen(false)
  }

  // Function to toggle global style dropdown
  const toggleGlobalStyleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setGlobalStyleDropdownOpen(prev => !prev)
  }
  
  // Function to select global style and apply to all posts
  const selectGlobalStyle = (style: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setGlobalSelectedStyle(style)
    
    // Áp dụng thể loại này cho tất cả các bài đăng
    const updatedStyles: Record<string | number, string> = {}
    posts.forEach(post => {
      updatedStyles[post.id] = style
    })
    setImageStylePerPost(updatedStyles)
    
    // Đóng dropdown
    setGlobalStyleDropdownOpen(false)
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
        const imageService = imageServicePerPost[postId]?.[0] || "ideogram"
        
        console.log(`Generating ${numImages} images with style "${imageStyle}" using service "${imageService}" for post ${postId}`)

        // Skip if this post is already being polled
        if (pollingPosts[postId]) {
          console.log(`Post ${postId} is already being polled, skipping generation`)
          return { success: true, status: "already_polling" }
        }

        // Call the actual API to generate images with the number of images, style, and services
        const result = await generateImagesForPost(postId, numImages, imageStyle, imageService)

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

        <div className="flex items-center gap-4">
          {/* Global selectors container */}
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border-2 border-black">
            {/* Global style dropdown */}
            <div className="flex items-center">
              <span className="text-sm font-medium mr-2">Style:</span>
              <div className="relative">
                <button
                  onClick={toggleGlobalStyleDropdown}
                  disabled={isGenerating || isSubmitting}
                  className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1 text-sm w-32 disabled:opacity-50 hover:bg-gray-50"
                >
                  <span>{IMAGE_STYLES.find(s => s.value === globalSelectedStyle)?.label || "Realistic"}</span>
                  <ChevronDown size={14} className={globalStyleDropdownOpen ? "transform rotate-180" : ""} />
                </button>

                {globalStyleDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-40 bg-white border-2 border-black rounded-md shadow-lg">
                    {IMAGE_STYLES.map((style) => (
                      <button
                        key={style.value}
                        onClick={(e) => selectGlobalStyle(style.value, e)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          globalSelectedStyle === style.value ? "bg-yellow-100 font-medium" : ""
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Global service dropdown */}
            <div className="flex items-center ml-2">
              <span className="text-sm font-medium mr-2">Service:</span>
              <div className="relative">
                <button
                  onClick={toggleGlobalServiceDropdown}
                  disabled={isGenerating || isSubmitting}
                  className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1 text-sm w-32 disabled:opacity-50 hover:bg-gray-50"
                >
                  <span>{IMAGE_SERVICES.find(s => s.value === globalSelectedService)?.label || "Ideogram"}</span>
                  <ChevronDown size={14} className={globalServiceDropdownOpen ? "transform rotate-180" : ""} />
                </button>

                {globalServiceDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-40 bg-white border-2 border-black rounded-md shadow-lg">
                    {IMAGE_SERVICES.map((service) => (
                      <button
                        key={service.value}
                        onClick={(e) => selectGlobalService(service.value, e)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                          globalSelectedService === service.value ? "bg-yellow-100 font-medium" : ""
                        }`}
                      >
                        {service.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Apply to all button */}
            <button
              onClick={() => {
                selectGlobalStyle(globalSelectedStyle, { stopPropagation: () => {} } as React.MouseEvent);
                selectGlobalService(globalSelectedService, { stopPropagation: () => {} } as React.MouseEvent);
                toast({
                  title: "Settings applied",
                  description: "Style and service applied to all posts",
                });
              }}
              className="ml-2 py-1 px-3 bg-blue-400 text-sm border-2 border-black rounded-md font-medium hover:bg-blue-500"
            >
              Apply to All
            </button>
          </div>

          <button
            onClick={manualForceUIRefresh}
            className="py-2 px-4 bg-blue-400 border-2 border-black rounded-md font-medium hover:bg-blue-500 flex items-center gap-1"
          >
            <RefreshCw size={16} />
            Refresh
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
              className="border-4 border-black rounded-md overflow-hidden bg-white shadow-md transition-all hover:shadow-lg"
            >
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-b-4 border-black flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center bg-black text-white rounded-full text-sm font-bold mr-2">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-lg">
                    {post.title || `Post ${index + 1}`}
                    {isCompleted && <CheckCircle size={16} className="inline ml-2 text-green-500" />}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  {hasGeneratedImages && (
                    <div className="flex items-center px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                      <span className="text-sm font-medium text-blue-700">
                        {selectedCount} of {postImages.length} selected
                      </span>
                    </div>
                  )}

                  {/* Image generation controls */}
                  <div className="flex items-center gap-2">
                    {/* Number of images selector */}
                    <div className="flex items-center gap-2 bg-white border-2 border-black rounded-md px-2 py-1">
                      <span className="text-xs text-gray-500 mr-1">Quantity:</span>
                      <button
                        onClick={() => decrementNumImages(post.id)}
                        disabled={numImages <= 1 || isGeneratingOrPolling}
                        className="text-black hover:bg-gray-100 rounded-full p-1 disabled:opacity-50 transition-colors"
                      >
                        <MinusCircle size={16} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{numImages}</span>
                      <button
                        onClick={() => incrementNumImages(post.id)}
                        disabled={numImages >= 10 || isGeneratingOrPolling}
                        className="text-black hover:bg-gray-100 rounded-full p-1 disabled:opacity-50 transition-colors"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>

                    {/* Style selector dropdown */}
                    <div className="relative" ref={(el) => {
                      dropdownRefs.current[post.id] = el;
                      return undefined;
                    }}>
                      <button
                        onClick={(e) => toggleDropdown(post.id, e)}
                        disabled={isGeneratingOrPolling}
                        className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1 text-sm w-32 disabled:opacity-50 transition-colors hover:bg-gray-50"
                      >
                        <span className="text-xs text-gray-500 mr-1">Style:</span>
                        <span className="font-medium truncate">{IMAGE_STYLES.find((style) => style.value === imageStyle)?.label || "Realistic"}</span>
                        <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? "transform rotate-180" : ""}`} />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-40 bg-white border-2 border-black rounded-md shadow-lg max-h-64 overflow-y-auto">
                          {IMAGE_STYLES.map((style) => (
                            <button
                              key={style.value}
                              onClick={(e) => selectImageStyle(post.id, style.value, e)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                imageStyle === style.value ? "bg-yellow-100 font-medium" : ""
                              }`}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Service selector dropdown */}
                    <div className="relative" ref={(el) => {
                      dropdownRefs.current[`service_${post.id}`] = el;
                      return undefined;
                    }}>
                      <button
                        onClick={(e) => toggleServiceDropdown(post.id, e)}
                        disabled={isGeneratingOrPolling}
                        className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1 text-sm w-40 disabled:opacity-50 transition-colors hover:bg-gray-50"
                      >
                        <span className="text-xs text-gray-500 mr-1">Service:</span>
                        <span className="font-medium truncate">
                          {IMAGE_SERVICES.find((service) => service.value === (imageServicePerPost[post.id]?.[0] || "ideogram"))?.label || "Ideogram"}
                        </span>
                        <ChevronDown size={14} className={`transition-transform ${openServiceDropdowns[post.id] ? "transform rotate-180" : ""}`} />
                      </button>

                      {openServiceDropdowns[post.id] && (
                        <div className="absolute z-10 mt-1 w-48 bg-white border-2 border-black rounded-md shadow-lg">
                          {IMAGE_SERVICES.map((service) => (
                            <button
                              key={service.value}
                              onClick={(e) => selectImageService(post.id, service.value, e)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                (imageServicePerPost[post.id]?.[0] || "ideogram") === service.value ? "bg-yellow-100 font-medium" : ""
                              }`}
                            >
                              {service.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRegenerateImages(post.id)}
                      disabled={isGeneratingOrPolling || isSubmitting}
                      className="py-1 px-3 bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-black rounded-md hover:opacity-90 active:opacity-80 transition-all flex items-center gap-1 text-sm disabled:opacity-50 text-white shadow-sm"
                    >
                      {isGeneratingOrPolling ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>{isPollingThisPost ? "Generating..." : "Regenerating..."}</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          <span>{hasGeneratedImages ? "Regenerate Images" : "Generate Images"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Cải thiện hiển thị nội dung bài đăng */}
                <div className="mb-6 bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-2">
                    <h4 className="text-xs uppercase text-gray-500 font-semibold tracking-wider bg-blue-50 px-2 py-1 rounded">Post Content</h4>
                  </div>
                  <p className="text-lg font-medium line-clamp-3">{post.content}</p>
                </div>

                {isGeneratingOrPolling ? (
                  <div className="h-64 flex flex-col items-center justify-center bg-gray-50 border-2 border-gray-200 border-dashed rounded-lg animate-pulse">
                    <div className="bg-purple-100 p-3 rounded-full mb-3">
                      <Loader2 size={32} className="animate-spin text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-700 bg-white px-3 py-1 rounded-full shadow-sm">
                      Generating {numImages} {IMAGE_STYLES.find((style) => style.value === imageStyle)?.label || "Realistic"} images
                    </span>
                    {isPollingThisPost && (
                      <div className="text-sm text-gray-500 mt-3 max-w-sm text-center">
                        <p>This process might take a moment.</p>
                        <p className="mt-1">Please wait...</p>
                      </div>
                    )}
                  </div>
                ) : hasError ? (
                  <div className="h-64 flex flex-col items-center justify-center bg-red-50 border-2 border-red-200 border-dashed rounded-lg p-4 shadow-inner">
                    <div className="bg-red-100 p-3 rounded-full mb-3">
                      <AlertCircle size={32} className="text-red-600" />
                    </div>
                    <p className="font-medium text-red-700 text-center text-lg mb-2">Error generating images</p>
                    <div className="text-sm text-red-600 text-center mt-1 px-4 py-2 bg-white rounded-lg border border-red-200 max-w-md">
                      {hasError}
                    </div>
                    <button 
                      onClick={() => handleRegenerateImages(post.id)}
                      className="mt-4 text-sm px-3 py-1 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                ) : hasGeneratedImages ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {postImages.map((image, imageIndex) => (
                        <div
                          key={imageIndex}
                          onClick={() => toggleImageSelection(post.id, imageIndex)}
                          className={`relative border-4 ${
                            image.isSelected 
                              ? "border-green-500 ring-4 ring-green-100" 
                              : "border-gray-200 hover:border-blue-300"
                          } rounded-lg overflow-hidden h-52 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl ${
                            image.isSelected ? "shadow-lg" : "shadow-sm"
                          }`}
                        >
                          <Image
                            src={image.url || "/placeholder.svg"}
                            alt={`Image ${imageIndex + 1} for post ${index + 1}`}
                            fill
                            className={`object-cover transition-all ${image.isSelected ? "brightness-105" : "hover:brightness-105"}`}
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            loading="lazy"
                          />
                          <div
                            className={`absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full ${
                              image.isSelected 
                                ? "bg-green-500 text-white scale-110 shadow-lg" 
                                : "bg-white border-2 border-gray-300"
                            } shadow-md transition-all duration-200`}
                          >
                            {image.isSelected ? <Check size={18} /> : null}
                          </div>
                          <div className="absolute top-3 left-3 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm">
                            {image.metadata?.style || imageStyle || "default"}
                          </div>
                          {image.isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-t from-green-500/20 to-transparent pointer-events-none"></div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-md border border-gray-200 flex items-center text-sm">
                      <div className="mr-2 w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center">
                        <Check size={14} className="text-blue-600" />
                      </div>
                      <p className="text-gray-700">Click on an image to select or deselect it.</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center bg-gray-50 border-2 border-gray-200 border-dashed rounded-lg">
                    <div className="bg-gray-100 p-4 rounded-full mb-3">
                      <Image src="/placeholder.svg" alt="No images" width={40} height={40} />
                    </div>
                    <span className="font-medium text-gray-600">No images have been generated yet.</span>
                    <button 
                      onClick={() => handleRegenerateImages(post.id)} 
                      className="mt-3 text-sm px-3 py-1 bg-white text-purple-700 border border-purple-300 rounded-md hover:bg-purple-50 transition-colors"
                    >
                      Generate images now
                    </button>
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
