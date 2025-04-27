"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { Post } from "../campaign-workflow"
import { CheckCircle, RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  checkImageGenerationStatus,
  processImageGeneration,
  saveImageSelection,
  clearPostImages,
} from "@/lib/actions_api"
import PostImageCard from "@/components/post-image-card"
import { generatePlaceholderImages, getSelectedImagesCount, isValidImageUrl } from "@/lib/image-generation-utils"

interface GenerateMultipleImagesProps {
  posts: Post[]
  onComplete: (posts: Post[]) => void
  onBack: () => void
  allowMissingImages?: boolean
}

export default function GenerateMultipleImages({
  posts,
  onComplete,
  onBack,
  allowMissingImages = true,
}: GenerateMultipleImagesProps) {
  // Main state
  const [localPosts, setLocalPosts] = useState<Post[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Generation state
  const [generatingPostIds, setGeneratingPostIds] = useState<Set<string | number>>(new Set())
  const [pollingPostIds, setPollingPostIds] = useState<Set<string | number>>(new Set())
  const [completedPostIds, setCompletedPostIds] = useState<Set<string | number>>(new Set())
  const [errorMessages, setErrorMessages] = useState<Record<string | number, string>>({})

  // UI state
  const [numImagesPerPost, setNumImagesPerPost] = useState<Record<string | number, number>>({})
  const [imageStylePerPost, setImageStylePerPost] = useState<Record<string | number, string>>({})
  const [imageServicePerPost, setImageServicePerPost] = useState<Record<string | number, string>>({})

  // Refs for stable references
  const localPostsRef = useRef<Post[]>([])
  const pollingTimersRef = useRef<Record<string | number, NodeJS.Timeout>>({})
  const pollingAttemptsRef = useRef<Record<string | number, number>>({})

  const { toast } = useToast()

  // Helper function to check if images are real (not placeholders)
  const hasRealImages = (post: Post) => {
    // First check image_status - if it's "generating", we're still waiting
    if (post.image_status === "generating") {
      return false
    }

    // If status is "completed", we should have images
    if (post.image_status === "completed") {
      return true
    }

    // Otherwise check the images content
    if (!post.images) return false
    try {
      const imagesData = JSON.parse(post.images)
      const images = imagesData.images?.images || imagesData.images || []
      return images.some((img: any) => {
        // Skip blob URLs and placeholders
        if (!img.url || img.url.includes("placeholder.svg") || img.url.startsWith("blob:")) {
          return false
        }
        return true
      })
    } catch (e) {
      console.error("Error parsing images JSON:", e)
      return false
    }
  }

  // Helper function to sanitize images data
  const sanitizeImagesData = (imagesData: any) => {
    if (!imagesData || !imagesData.images) return { images: [] }

    // Filter out blob URLs and invalid images
    const sanitizedImages = imagesData.images.filter((img: any) => {
      return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
    })

    return { images: sanitizedImages }
  }

  // Initialize posts with placeholders if needed
  useEffect(() => {
    const initializedPosts = posts.map((post) => {
      // Keep existing images if they're real (not placeholders)
      if (post.images && hasRealImages(post)) {
        try {
          // Parse and sanitize existing images
          const imagesData = JSON.parse(post.images)
          const sanitizedData = sanitizeImagesData(imagesData)

          // Only use sanitized data if it has images
          if (sanitizedData.images.length > 0) {
            return {
              ...post,
              images: JSON.stringify(sanitizedData),
            }
          }
        } catch (e) {
          console.error("Error sanitizing images:", e)
        }
      }

      // Otherwise add placeholder images
      const placeholderImages = generatePlaceholderImages(post.id)
      return {
        ...post,
        images: JSON.stringify({ images: placeholderImages }),
      }
    })

    setLocalPosts(initializedPosts)
    localPostsRef.current = initializedPosts

    // Initialize settings for each post
    const initialNumImages: Record<string | number, number> = {}
    const initialImageStyles: Record<string | number, string> = {}
    const initialImageServices: Record<string | number, string> = {}

    posts.forEach((post) => {
      initialNumImages[post.id] = 1
      initialImageStyles[post.id] = "realistic"
      initialImageServices[post.id] = "flux" // Default to flux
    })

    setNumImagesPerPost(initialNumImages)
    setImageStylePerPost(initialImageStyles)
    setImageServicePerPost(initialImageServices)
  }, [posts])

  // Update ref when localPosts changes
  useEffect(() => {
    localPostsRef.current = localPosts
  }, [localPosts])

  // Force UI refresh
  const forceRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1 + Math.random())
    setLocalPosts((prevPosts) => [...prevPosts])
  }, [])

  // Stop polling for a post
  const stopPollingForPost = useCallback(
    (postId: string | number) => {
      // Clear timer
      if (pollingTimersRef.current[postId]) {
        clearInterval(pollingTimersRef.current[postId])
        delete pollingTimersRef.current[postId]
      }

      // Remove from polling set
      setPollingPostIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })

      // Clear polling attempts
      delete pollingAttemptsRef.current[postId]

      // Add to completed set
      setCompletedPostIds((prev) => {
        const next = new Set(prev)
        next.add(postId)
        return next
      })

      // Force a UI refresh when stopping polling
      setTimeout(() => forceRefresh(), 0)
    },
    [forceRefresh],
  )

  // Add a function to preload and validate images
  const preloadAndValidateImage = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!url || url.includes("placeholder.svg") || url.startsWith("blob:")) {
        resolve(false)
        return
      }

      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url

      // Set a timeout to prevent hanging
      setTimeout(() => resolve(false), 5000)
    })
  }

  // Update post with new images
  const updatePostWithImages = useCallback(
    async (postId: number, images: any[]) => {
      // Filter out blob URLs and invalid images
      const validImages = images.filter((img) => {
        return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
      })

      // If no valid images, show error
      if (validImages.length === 0) {
        setErrorMessages((prev) => ({
          ...prev,
          [postId]: "No valid images were generated",
        }))

        stopPollingForPost(postId)
        return
      }

      // Preload and validate images
      const validationPromises = validImages.map((img) => preloadAndValidateImage(img.url))
      const validationResults = await Promise.all(validationPromises)

      // Filter out images that failed validation
      const confirmedValidImages = validImages.filter((_, index) => validationResults[index])

      if (confirmedValidImages.length === 0) {
        setErrorMessages((prev) => ({
          ...prev,
          [postId]: "All images failed to load",
        }))
        stopPollingForPost(postId)
        return
      }

      // Format images data
      const formattedData = {
        images: confirmedValidImages.map((img, idx) => ({
          ...img,
          isSelected: true,
          order: idx,
        })),
      }

      // Update local posts
      setLocalPosts((prevPosts) => {
        const updatedPosts = prevPosts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              images: JSON.stringify(formattedData),
              imageUrl: confirmedValidImages[0]?.url || post.imageUrl,
              image_status: "completed", // Update the status in local state
            }
          }
          return post
        })

        // Update ref immediately
        localPostsRef.current = updatedPosts
        return updatedPosts
      })

      // Mark as completed
      setCompletedPostIds((prev) => {
        const next = new Set(prev)
        next.add(postId)
        return next
      })

      // Clear any errors
      setErrorMessages((prev) => {
        const next = { ...prev }
        delete next[postId]
        return next
      })

      // Remove from generating set
      setGeneratingPostIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })

      // Remove from polling set
      setPollingPostIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })

      // Save to database
      if (typeof postId === "number") {
        setTimeout(async () => {
          try {
            await saveImageSelection(postId, JSON.stringify(formattedData), confirmedValidImages[0]?.url || "")
          } catch (error) {
            console.error("Error saving images to database:", error)
          }

          // Force refresh after database update
          forceRefresh()
        }, 0)
      }

      // Force UI refresh immediately
      forceRefresh()
    },
    [forceRefresh, stopPollingForPost],
  )

  // Start polling for a post
  const startPollingForPost = useCallback(
    (postId: number) => {
      // Add to polling set
      setPollingPostIds((prev) => {
        const next = new Set(prev)
        next.add(postId)
        return next
      })

      // Reset polling attempts
      pollingAttemptsRef.current[postId] = 0

      // Clear any existing timer
      if (pollingTimersRef.current[postId]) {
        clearInterval(pollingTimersRef.current[postId])
        delete pollingTimersRef.current[postId]
      }

      // Create individual polling timer
      const timerId = setInterval(async () => {
        pollingAttemptsRef.current[postId] = (pollingAttemptsRef.current[postId] || 0) + 1
        const attempts = pollingAttemptsRef.current[postId]

        try {
          const result = await checkImageGenerationStatus(postId)

          if (result.success) {
            // First check if status is completed or we have images
            if (result.data.status === "completed" || result.data.hasImages) {
              // Stop polling
              clearInterval(pollingTimersRef.current[postId])
              delete pollingTimersRef.current[postId]

              // Remove from polling set
              setPollingPostIds((prev) => {
                const next = new Set(prev)
                next.delete(postId)
                return next
              })

              // Update post with images if available
              if (result.data.images && result.data.images.length > 0) {
                // Filter out blob URLs
                const validImages = result.data.images.filter((img: any) => {
                  return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
                })

                if (validImages.length > 0) {
                  updatePostWithImages(postId, validImages)

                  toast({
                    title: "Images ready",
                    description: `Images for post ${postId} have been generated successfully.`,
                  })
                } else {
                  setErrorMessages((prev) => ({
                    ...prev,
                    [postId]: "No valid images were generated",
                  }))
                  stopPollingForPost(postId)
                }
              } else {
                // Try one more direct fetch
                try {
                  const directResult = await checkImageGenerationStatus(postId)
                  if (directResult.success && directResult.data.images && directResult.data.images.length > 0) {
                    // Filter out blob URLs
                    const validImages = directResult.data.images.filter((img: any) => {
                      return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
                    })

                    if (validImages.length > 0) {
                      updatePostWithImages(postId, validImages)
                    } else {
                      setErrorMessages((prev) => ({
                        ...prev,
                        [postId]: "Generation completed but no images found",
                      }))
                      stopPollingForPost(postId)
                    }
                  } else {
                    setErrorMessages((prev) => ({
                      ...prev,
                      [postId]: "Generation completed but no images found",
                    }))
                  }
                } catch (e) {
                  console.error("Error in final fetch attempt:", e)
                  setErrorMessages((prev) => ({
                    ...prev,
                    [postId]: "Error in final fetch attempt",
                  }))
                }
              }

              // Force UI refresh
              forceRefresh()
            } else if (result.data.status === "generating") {
              // Continue polling
              if (attempts >= 30) {
                // Stop polling after max attempts
                stopPollingForPost(postId)

                setErrorMessages((prev) => ({
                  ...prev,
                  [postId]: "Timed out waiting for images",
                }))

                forceRefresh()
              }
            } else if (attempts >= 30) {
              // Stop polling after max attempts on error
              stopPollingForPost(postId)

              setErrorMessages((prev) => ({
                ...prev,
                [postId]: result.error || "Failed to check image status",
              }))

              forceRefresh()
            }
          }
        } catch (error) {
          console.error(`Error polling for post ${postId}:`, error)

          if (attempts >= 30) {
            stopPollingForPost(postId)

            setErrorMessages((prev) => ({
              ...prev,
              [postId]: "Error checking image status",
            }))

            forceRefresh()
          }
        }
      }, 4000)

      pollingTimersRef.current[postId] = timerId
    },
    [forceRefresh, stopPollingForPost, toast, updatePostWithImages],
  )

  // Global polling interval
  useEffect(() => {
    const globalPollingInterval = setInterval(async () => {
      // Get all posts being polled
      const pollingIds = Array.from(pollingPostIds)
      if (pollingIds.length === 0) return

      // Check each post in parallel
      const results = await Promise.all(
        pollingIds.map(async (postId) => {
          if (typeof postId !== "number") return null

          try {
            const result = await checkImageGenerationStatus(postId)

            if (result.success) {
              // First check the image_status
              if (result.data.status === "completed") {
                // If status is completed, we should have images
                if (result.data.images && result.data.images.length > 0) {
                  // Process images as before
                  const validImages = result.data.images.filter((img: any) => {
                    return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
                  })

                  if (validImages.length > 0) {
                    updatePostWithImages(postId, validImages)
                    stopPollingForPost(postId)

                    toast({
                      title: "Images ready",
                      description: `Images for post ${postId} have been generated successfully.`,
                    })

                    return { updated: true, postId }
                  }
                } else {
                  // Status is completed but no images found - this is an error
                  setErrorMessages((prev) => ({
                    ...prev,
                    [postId]: "Generation completed but no images found",
                  }))
                  stopPollingForPost(postId)
                }
              }
              // If status is generating, keep polling
              else if (result.data.status === "generating") {
                // Continue polling
                pollingAttemptsRef.current[postId] = (pollingAttemptsRef.current[postId] || 0) + 1

                // Stop after max attempts
                if (pollingAttemptsRef.current[postId] >= 30) {
                  setErrorMessages((prev) => ({
                    ...prev,
                    [postId]: "Timed out waiting for images",
                  }))
                  stopPollingForPost(postId)
                }
              }
              // If we have images regardless of status
              else if (result.data.hasImages && result.data.images?.length > 0) {
                // Process images as before
                const validImages = result.data.images.filter((img: any) => {
                  return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
                })

                if (validImages.length > 0) {
                  updatePostWithImages(postId, validImages)
                  stopPollingForPost(postId)

                  toast({
                    title: "Images ready",
                    description: `Images for post ${postId} have been generated successfully.`,
                  })

                  return { updated: true, postId }
                }
              }
            }
          } catch (error) {
            console.error(`Error checking status for post ${postId}:`, error)
          }

          return null
        }),
      )

      // If any posts were updated, force a UI refresh
      if (results.some((result) => result?.updated)) {
        forceRefresh()
      }
    }, 5000)

    return () => {
      clearInterval(globalPollingInterval)

      // Clean up all polling timers
      Object.keys(pollingTimersRef.current).forEach((id) => {
        clearInterval(pollingTimersRef.current[id])
        delete pollingTimersRef.current[id]
      })
    }
  }, [pollingPostIds, toast, updatePostWithImages, stopPollingForPost, forceRefresh])

  // Handle regenerating images for a post
  const handleRegenerateImages = async (postId: string | number) => {
    // Remove from completed set
    setCompletedPostIds((prev) => {
      const next = new Set(prev)
      next.delete(postId)
      return next
    })

    // Stop any existing polling
    if (typeof postId === "number" && pollingPostIds.has(postId)) {
      stopPollingForPost(postId)
    }

    // Clear existing images
    if (typeof postId === "number") {
      // Update local state with placeholder
      const placeholderImages = generatePlaceholderImages(postId)
      setLocalPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              images: JSON.stringify({ images: placeholderImages }),
              image_status: "pending", // Reset status
            }
          }
          return post
        })
      })

      // Force refresh immediately
      forceRefresh()

      // Clear images in database
      try {
        await clearPostImages(postId, placeholderImages)
      } catch (error) {
        console.error("Error clearing images in database:", error)
      }
    }

    // Generate new images
    await handleGenerateImages(postId)
  }

  // Generate images for a post
  const handleGenerateImages = async (postId: string | number) => {
    // Clear any errors
    setErrorMessages((prev) => {
      const next = { ...prev }
      delete next[postId]
      return next
    })

    // Add to generating set
    setGeneratingPostIds((prev) => {
      const next = new Set(prev)
      next.add(postId)
      return next
    })

    try {
      if (typeof postId === "number") {
        const numImages = numImagesPerPost[postId] || 1
        const imageStyle = imageStylePerPost[postId] || "realistic"
        const imageService = imageServicePerPost[postId] || "flux"

        // Skip if already polling
        if (pollingPostIds.has(postId)) {
          // Remove from generating set
          setGeneratingPostIds((prev) => {
            const next = new Set(prev)
            next.delete(postId)
            return next
          })

          return { success: true, status: "already_polling" }
        }

        // Update local state to show generating status
        setLocalPosts((prevPosts) => {
          return prevPosts.map((post) => {
            if (post.id === postId) {
              return {
                ...post,
                image_status: "generating", // Set status to generating
              }
            }
            return post
          })
        })

        // Call API to generate images
        const result = await processImageGeneration(postId, numImages, imageStyle, imageService)

        if (!result.success) {
          toast({
            title: "Error",
            description: `Error for post ${postId}: ${result.error}`,
            variant: "destructive",
          })

          // Store error
          setErrorMessages((prev) => ({ ...prev, [postId]: result.error || "Unknown error" }))

          // Remove from generating set
          setGeneratingPostIds((prev) => {
            const next = new Set(prev)
            next.delete(postId)
            return next
          })

          // Reset status in local state
          setLocalPosts((prevPosts) => {
            return prevPosts.map((post) => {
              if (post.id === postId) {
                return {
                  ...post,
                  image_status: "pending", // Reset status on error
                }
              }
              return post
            })
          })

          return result
        }

        // Check if processing or immediate results
        if (result.status === "processing") {
          toast({
            title: "Generating images",
            description: `Generating ${numImages} ${imageStyle} style images using ${imageService} for post ${postId}. This may take a minute...`,
          })

          // Start polling
          startPollingForPost(postId)

          return result
        }

        // If immediate results
        if (result.status === "completed" && result.images && result.images.length > 0) {
          // Filter out blob URLs
          const validImages = result.images.filter((img: any) => {
            return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
          })

          if (validImages.length > 0) {
            // Update post with images
            updatePostWithImages(postId, validImages)

            toast({
              title: "Images generated",
              description: `New images have been generated for post ${postId}.`,
            })

            return result
          } else {
            // No valid images
            setErrorMessages((prev) => ({
              ...prev,
              [postId]: "No valid images were generated",
            }))

            // Remove from generating set
            setGeneratingPostIds((prev) => {
              const next = new Set(prev)
              next.delete(postId)
              return next
            })

            // Reset status in local state
            setLocalPosts((prevPosts) => {
              return prevPosts.map((post) => {
                if (post.id === postId) {
                  return {
                    ...post,
                    image_status: "pending", // Reset status if no valid images
                  }
                }
                return post
              })
            })

            return { success: false, error: "No valid images were generated" }
          }
        } else {
          // No immediate images but not an error
          toast({
            title: "Generating images",
            description: `Generating ${numImages} ${imageStyle} style images using ${imageService} for post ${postId}. This may take a minute...`,
          })

          // Start polling
          startPollingForPost(postId)

          return { success: true, status: "processing" }
        }
      } else {
        // Non-numeric ID
        const errorMessage = "Cannot generate images for posts without a valid ID"

        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })

        // Store error
        setErrorMessages((prev) => ({ ...prev, [postId]: errorMessage }))

        // Remove from generating set
        setGeneratingPostIds((prev) => {
          const next = new Set(prev)
          next.delete(postId)
          return next
        })

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

      // Store error
      setErrorMessages((prev) => ({ ...prev, [postId]: errorMessage }))

      // Remove from generating set
      setGeneratingPostIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })

      // Reset status in local state
      setLocalPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              image_status: "pending", // Reset status on error
            }
          }
          return post
        })
      })

      return { success: false, error: errorMessage }
    }
  }

  // Handle generating all images
  const handleGenerateAllImages = async () => {
    // Set a loading state to prevent multiple clicks
    setIsSubmitting(true)

    try {
      // Batch state updates together
      setErrorMessages({})
      setCompletedPostIds(new Set())

      // Get all posts that need processing
      const postsToProcess = [...localPosts].filter((post) => !pollingPostIds.has(post.id))

      if (postsToProcess.length === 0) {
        toast({
          title: "No posts to process",
          description: "All posts are already being processed.",
        })
        setIsSubmitting(false)
        return
      }

      // Prepare all placeholder images first (no state updates yet)
      const updates = {}
      for (const post of postsToProcess) {
        if (typeof post.id === "number") {
          updates[post.id] = generatePlaceholderImages(post.id)
        }
      }

      // Batch update all posts at once
      setLocalPosts((prevPosts) => {
        return prevPosts.map((post) => {
          if (updates[post.id]) {
            return {
              ...post,
              images: JSON.stringify({ images: updates[post.id] }),
              image_status: "pending", // Reset status
            }
          }
          return post
        })
      })

      // Force a single refresh after all updates
      forceRefresh()

      // Clear images in database in parallel
      const clearPromises = Object.entries(updates).map(([postId, placeholderImages]) =>
        clearPostImages(Number(postId), placeholderImages),
      )

      // Wait for all clear operations to complete
      await Promise.all(clearPromises)

      // Process in batches of 3 to avoid overwhelming the server
      const batchSize = 3
      let successCount = 0
      let processingCount = 0
      let errorCount = 0

      for (let i = 0; i < postsToProcess.length; i += batchSize) {
        const batch = postsToProcess.slice(i, i + batchSize)

        // Process batch in parallel
        const results = await Promise.all(
          batch.map(async (post) => {
            if (typeof post.id !== "number") return { success: false }

            const numImages = numImagesPerPost[post.id] || 1
            const result = await handleGenerateImages(post.id)

            return result
          }),
        )

        // Count results
        results.forEach((result) => {
          if (!result.success) {
            errorCount++
          } else if (result.status === "processing") {
            processingCount++
          } else if (result.status === "completed") {
            successCount++
          }
        })

        // Small delay between batches, not between individual posts
        if (i + batchSize < postsToProcess.length) {
          await new Promise((resolve) => setTimeout(resolve, 300))
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
          description: `Generated images for ${successCount} posts.`,
        })
      }

      // Final refresh
      forceRefresh()
    } catch (error) {
      console.error("Error generating all images:", error)
      toast({
        title: "Error",
        description: "Failed to generate all images: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
    } finally {
      // Always reset submitting state
      setIsSubmitting(false)
    }
  }

  // Manual UI refresh
  const manualForceUIRefresh = async () => {
    // Check all polling posts
    const pollingPromises = Array.from(pollingPostIds).map(async (postId) => {
      if (typeof postId === "number") {
        try {
          const result = await checkImageGenerationStatus(postId)

          if (result.success && result.data.hasImages && result.data.images?.length > 0) {
            // Filter out blob URLs
            const validImages = result.data.images.filter((img: any) => {
              return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
            })

            if (validImages.length > 0) {
              updatePostWithImages(postId, validImages)
              stopPollingForPost(postId)
            }
          }
        } catch (e) {
          console.error(`Error checking status for post ${postId} during manual refresh:`, e)
        }
      }
    })

    // Wait for all checks to complete
    await Promise.all(pollingPromises)

    // Refresh all posts from database
    try {
      for (const post of localPosts) {
        if (typeof post.id === "number") {
          const result = await checkImageGenerationStatus(post.id)
          if (result.success && result.data.hasImages && result.data.images?.length > 0) {
            // Filter out blob URLs
            const validImages = result.data.images.filter((img: any) => {
              return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
            })

            if (validImages.length > 0) {
              updatePostWithImages(post.id, validImages)
            }
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

    // Force refresh
    forceRefresh()
  }

  // Toggle image selection
  const toggleImageSelection = async (postId: string | number, imageIndex: number) => {
    setLocalPosts((prevPosts) => {
      const updatedPosts = prevPosts.map((post) => {
        if (post.id === postId && post.images) {
          try {
            const imagesData = JSON.parse(post.images)
            const images = imagesData.images?.images || imagesData.images || []

            // Skip if the image is a blob URL
            if (images[imageIndex]?.url?.startsWith("blob:")) {
              return post
            }

            const updatedImages = images.map((img: any, idx: number) => {
              return {
                ...img,
                isSelected: idx === imageIndex ? !img.isSelected : img.isSelected,
              }
            })

            // Update main image URL if needed
            let newImageUrl = post.imageUrl

            // If toggling ON, make it the main image
            if (updatedImages[imageIndex].isSelected) {
              newImageUrl = updatedImages[imageIndex].url
            }
            // If toggling OFF and it was the main image, find another selected image
            else if (post.imageUrl === images[imageIndex].url) {
              const firstSelectedImage = updatedImages.find((img: any) => img.isSelected)
              newImageUrl = firstSelectedImage ? firstSelectedImage.url : post.imageUrl
            }

            // Create updated images structure
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

      // Save to database
      const updatedPost = updatedPosts.find((p) => p.id === postId)
      if (updatedPost && typeof postId === "number" && updatedPost.images) {
        setTimeout(async () => {
          try {
            const imagesData = JSON.parse(updatedPost.images)
            const images = imagesData.images?.images || imagesData.images || []
            const selectedImages = images.filter((img: any) => img.isSelected)

            // Get main image URL
            const mainImageUrl = selectedImages.length > 0 ? selectedImages[0].url : updatedPost.imageUrl

            await saveImageSelection(postId, updatedPost.images, mainImageUrl)
          } catch (error) {
            console.error("Error saving image selection:", error)
            toast({
              title: "Warning",
              description: "Failed to save selection to database",
              variant: "destructive",
            })
          }
        }, 0)
      }

      return updatedPosts
    })
  }

  // Handle completion
  const handleComplete = async () => {
    setIsSubmitting(true)

    try {
      // Save selections to database
      for (const post of localPosts) {
        if (typeof post.id === "number" && post.images) {
          try {
            const imagesData = JSON.parse(post.images)
            const images = imagesData.images?.images || imagesData.images || []

            // Filter out blob URLs and invalid images
            const validSelectedImages = images.filter((img: any) => {
              return img.isSelected && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
            })

            // Only save if there are selected non-placeholder images
            if (validSelectedImages.length > 0 && !validSelectedImages[0].url.includes("placeholder.svg")) {
              // Get the first selected image as the main image
              const mainImageUrl = validSelectedImages[0].url

              // Create sanitized images data
              const sanitizedImagesData = {
                images: images.filter((img: any) => {
                  return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
                }),
              }

              await saveImageSelection(post.id, JSON.stringify(sanitizedImagesData), mainImageUrl)
            }
          } catch (e) {
            console.error("Error saving final image selection:", e)
          }
        }
      }

      // Sanitize posts before passing them to onComplete
      const sanitizedPosts = localPosts.map((post) => {
        if (post.images) {
          try {
            const imagesData = JSON.parse(post.images)
            const sanitizedData = sanitizeImagesData(imagesData)

            return {
              ...post,
              images: JSON.stringify(sanitizedData),
            }
          } catch (e) {
            console.error("Error sanitizing post images:", e)
          }
        }
        return post
      })

      // Call onComplete with updated posts
      onComplete(sanitizedPosts)
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

  // UI helper functions
  const handleChangeNumImages = (postId: string | number, value: number) => {
    setNumImagesPerPost((prev) => ({
      ...prev,
      [postId]: value,
    }))
  }

  const handleChangeImageStyle = (postId: string | number, style: string) => {
    setImageStylePerPost((prev) => ({
      ...prev,
      [postId]: style,
    }))
  }

  const handleChangeImageService = (postId: string | number, service: string) => {
    setImageServicePerPost((prev) => ({
      ...prev,
      [postId]: service,
    }))
  }

  // Check if any posts are being processed
  const isGeneratingAny = generatingPostIds.size > 0
  const isPollingAny = pollingPostIds.size > 0
  const isProcessingAny = isGeneratingAny || isPollingAny

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
            disabled={isProcessingAny || isSubmitting}
            className="py-2 px-4 bg-purple-400 border-2 border-black rounded-md font-medium hover:bg-purple-500 flex items-center gap-2"
          >
            {isGeneratingAny ? (
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
        {localPosts.map((post, index) => (
          <PostImageCard
            key={`${post.id}-${refreshKey}`}
            post={post}
            index={index}
            isGenerating={generatingPostIds.has(post.id)}
            isPolling={pollingPostIds.has(post.id)}
            hasError={!!errorMessages[post.id]}
            errorMessage={errorMessages[post.id]}
            numImages={numImagesPerPost[post.id] || 1}
            imageStyle={imageStylePerPost[post.id] || "realistic"}
            imageService={imageServicePerPost[post.id] || "flux"}
            isSubmitting={isSubmitting}
            onRegenerateImages={handleRegenerateImages}
            onToggleImageSelection={toggleImageSelection}
            onChangeNumImages={handleChangeNumImages}
            onChangeImageStyle={handleChangeImageStyle}
            onChangeImageService={handleChangeImageService}
          />
        ))}
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
            disabled={isSubmitting || isProcessingAny}
            className="py-3 px-6 bg-green-500 border-2 border-black rounded-md font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : isProcessingAny ? (
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
            disabled={isSubmitting || isProcessingAny}
            className="py-3 px-6 bg-yellow-500 border-2 border-black rounded-md font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Submitting...
              </>
            ) : isProcessingAny ? (
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
