"use client"

const MAX_POLL_ATTEMPTS = 20 // Example value, adjust as needed
const POLL_INTERVAL = 5000 // Example value in ms (5 seconds), adjust as needed

import { useState, useEffect, useCallback } from "react"
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
import { UploadButton } from "@/lib/uploadthing";


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
  // Core state
  const [localPosts, setLocalPosts] = useState<Post[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [processingPosts, setProcessingPosts] = useState<Record<string | number, boolean>>({})
  const [errorMessages, setErrorMessages] = useState<Record<string | number, string>>({})
  const [settings, setSettings] = useState<
    Record<string | number, { numImages: number; imageStyle: string; imageService: string }>
  >({})

  const { toast } = useToast()

  // Check if any posts are being processed
  const isProcessingAny = Object.values(processingPosts).some(Boolean)

  // Check if post has real images
  const hasRealImages = useCallback((post: Post) => {
    if (!post.images) return false

    try {
      const imagesData = JSON.parse(post.images)
      const images = imagesData.images || []

      return images.some(
        (img) => img && img.url && !img.url.includes("placeholder.svg") && !img.url.startsWith("blob:"),
      )
    } catch (e) {
      return false
    }
  }, [])

  // Initialize posts with placeholders and settings
  useEffect(() => {
    const initialPosts = posts.map((post) => {
      // Keep existing images if they exist and are valid
      if (post.image_status === "completed" && post.images) {
        try {
          // Check if the post actually has real images
          if (hasRealImages(post)) {
            return post
          }
        } catch (e) {
          console.error("Error with existing images:", e)
        }
      }

      // Add placeholder images
      return {
        ...post,
        images: JSON.stringify({ images: generatePlaceholderImages(post.id) }),
        image_status: post.image_status || "pending",
      }
    })

    setLocalPosts(initialPosts)

    // Initialize settings
    const initialSettings = {}
    posts.forEach((post) => {
      initialSettings[post.id] = {
        numImages: 1,
        imageStyle: "realistic",
        imageService: "flux",
      }
    })
    setSettings(initialSettings)
  }, [posts, hasRealImages])

  // Check image status and update if needed
  const checkImageStatus = useCallback(async (postId: number) => {
    try {
      const result = await checkImageGenerationStatus(postId)

      if (result.success) {
        // If status is completed or we have images
        if (result.data.status === "completed" || result.data.hasImages) {
          // Update post with images
          if (result.data.images?.length > 0) {
            const validImages = result.data.images.filter(
              (img) => img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url),
            )

            if (validImages.length > 0) {
              // Format images data
              const formattedData = {
                images: validImages.map((img, idx) => ({
                  ...img,
                  isSelected: true,
                  order: idx,
                })),
              }

              // Update local state
              setLocalPosts((posts) =>
                posts.map((post) =>
                  post.id === postId
                    ? {
                        ...post,
                        images: JSON.stringify(formattedData),
                        imageUrl: validImages[0]?.url || post.imageUrl,
                        image_status: "completed",
                      }
                    : post,
                ),
              )

              // Save to database
              await saveImageSelection(postId, JSON.stringify(formattedData), validImages[0]?.url || "")

              // Clear processing state
              setProcessingPosts((prev) => ({ ...prev, [postId]: false }))
              setErrorMessages((prev) => {
                const next = { ...prev }
                delete next[postId]
                return next
              })

              return true
            }
          }
        }
      }
      return false
    } catch (error) {
      console.error(`Error checking image status for post ${postId}:`, error)
      return false
    }
  }, [])

  // Generate images for a post
  const generateImages = useCallback(
    async (postId: number) => {
      // Skip if already processing
      if (processingPosts[postId]) return

      // Set processing state
      setProcessingPosts((prev) => ({ ...prev, [postId]: true }))
      setErrorMessages((prev) => {
        const next = { ...prev }
        delete next[postId]
        return next
      })

      try {
        // Update local state
        setLocalPosts((posts) =>
          posts.map((post) => (post.id === postId ? { ...post, image_status: "generating" } : post)),
        )

        // Get settings
        const { numImages, imageStyle, imageService } = settings[postId] || {
          numImages: 1,
          imageStyle: "realistic",
          imageService: "flux",
        }

        // Call API
        const result = await processImageGeneration(postId, numImages, imageStyle, imageService)

        if (!result.success) {
          // Handle error
          setErrorMessages((prev) => ({ ...prev, [postId]: result.error || "Failed to generate images" }))
          setLocalPosts((posts) =>
            posts.map((post) => (post.id === postId ? { ...post, image_status: "pending" } : post)),
          )
          setProcessingPosts((prev) => ({ ...prev, [postId]: false }))

          toast({
            title: "Error",
            description: `Failed to generate images for post ${postId}: ${result.error}`,
            variant: "destructive",
          })
          return
        }

        // Show toast
        toast({
          title: "Generating images",
          description: `Generating ${numImages} ${imageStyle} images for post ${postId}...`,
        })

        // If we got immediate results
        if (result.status === "completed" && result.images?.length > 0) {
          await checkImageStatus(postId)
          return
        }

        // Start polling after a delay
        setTimeout(() => {
          pollImageStatus(postId, 0)
        }, 3000)
      } catch (error) {
        console.error(`Error generating images for post ${postId}:`, error)
        setErrorMessages((prev) => ({ ...prev, [postId]: "Error generating images" }))
        setProcessingPosts((prev) => ({ ...prev, [postId]: false }))
        setLocalPosts((posts) =>
          posts.map((post) => (post.id === postId ? { ...post, image_status: "pending" } : post)),
        )
      }
    },
    [processingPosts, settings, toast, checkImageStatus],
  )

  // Poll for image status
  const pollImageStatus = useCallback(
    async (postId: number, attempt = 1) => {
      // Max attempts
      if (attempt > MAX_POLL_ATTEMPTS) {
        setErrorMessages((prev) => ({
          ...prev,
          [postId]: `Polling timed out after ${MAX_POLL_ATTEMPTS} attempts. Please try regenerating. Status: ${localPosts.find(p => p.id === postId)?.image_status}`,
        }))
        setProcessingPosts((prev) => ({ ...prev, [postId]: false }))
        setLocalPosts((posts) =>
          posts.map((p) => (p.id === postId ? { ...p, image_status: "failed" } : p)),
        )
        return
      }

      // Check status
      const isCompleted = await checkImageStatus(postId)

      if (isCompleted) {
        // If completed, stop polling
        setProcessingPosts((prev) => ({ ...prev, [postId]: false }))
        setErrorMessages((prev) => {
          const next = { ...prev }
          delete next[postId]
          return next
        })
      } else {
        // If not completed, poll again after a delay
        setTimeout(() => pollImageStatus(postId, attempt + 1), POLL_INTERVAL)
      }
    },
    [checkImageStatus, localPosts], // Removed forceRefresh
  )

  // Periodically check for images for all posts that are generating
  useEffect(() => {
    if (!isProcessingAny) return

    const interval = setInterval(() => {
      // Find all posts that are generating
      const generatingPosts = localPosts.filter(
        (post) => post.image_status === "generating" || processingPosts[post.id],
      )

      // Check each post
      generatingPosts.forEach((post) => {
        if (typeof post.id === "number") {
          checkImageStatus(post.id).then((updated) => {
            if (updated) {
              // Force refresh if any post was updated
              // forceRefresh() // Removed
            }
          })
        }
      })
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [localPosts, processingPosts, isProcessingAny, checkImageStatus])

  // Regenerate images
  const handleRegenerateImages = useCallback(
    async (postId: number) => {
      // Immediate UI feedback
      const placeholderImages = generatePlaceholderImages(postId)
      
      // Update UI state immediately
      setLocalPosts((posts) =>
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                images: JSON.stringify({ images: placeholderImages }),
                image_status: "generating", // Changed from "pending" to "generating"
              }
            : post,
        )
      )
      
      // Set processing state immediately
      setProcessingPosts((prev) => ({ ...prev, [postId]: true }))
      
      // Clear error messages immediately
      setErrorMessages((prev) => {
        const next = { ...prev }
        delete next[postId]
        return next
      })
  
      // Show immediate feedback toast
      toast({
        title: "Regenerating Images",
        description: "Starting image regeneration process...",
      })
  
      // Background tasks
      try {
        // Clear in database (non-blocking)
        clearPostImages(postId, placeholderImages).catch(console.error)
        
        // Generate new images
        await generateImages(postId)
      } catch (error) {
        console.error(`Error regenerating images for post ${postId}:`, error)
        // Error handling is already done in generateImages
      }
    },
    [generateImages, toast],
  )

  // Generate all images
  const handleGenerateAllImages = useCallback(async () => {
    setIsSubmitting(true);

    let postsToProcessGlobal: Post[] = []; // To use in finally/catch block if needed

    try {
      setErrorMessages({});
      const postsToProcess = localPosts.filter((post) => !processingPosts[post.id]);
      postsToProcessGlobal = postsToProcess; // Assign for potential use in error handling

      if (postsToProcess.length === 0) {
        toast({
          title: "No posts to process",
          description: "All posts are already being processed.",
        });
        setIsSubmitting(false);
        return;
      }

      // Stage 1: Immediate UI update to show "generating" state for all selected posts
      const updatedProcessingState = { ...processingPosts };
      const postsWithImmediateStatusUpdate = localPosts.map(p => {
        const isTargetPost = postsToProcess.find(ptp => ptp.id === p.id);
        if (isTargetPost) {
          if (typeof p.id === 'number') {
            updatedProcessingState[p.id] = true;
          }
          return { ...p, image_status: "generating" }; // Set to "generating" for immediate feedback
        }
        return p;
      });

      setLocalPosts(postsWithImmediateStatusUpdate);
      setProcessingPosts(updatedProcessingState);

      // Stage 2: Background processing (clear existing images in DB and update local image placeholders)
      // This loop contains awaits, so it runs after the immediate UI update.
      for (const post of postsToProcess) {
        if (typeof post.id === "number") {
          const placeholderImages = generatePlaceholderImages(post.id);
          // Update local post's images to placeholders (this will be a quick follow-up UI update for each post)
          setLocalPosts(prevPosts =>
            prevPosts.map(p =>
              p.id === post.id
                ? { ...p, images: JSON.stringify({ images: placeholderImages }) }
                : p
            )
          );
          await clearPostImages(post.id, placeholderImages); // DB operation
        }
      }

      // Stage 3: Process in batches (actual image generation calls)
      const batchSize = 2; // Consider making this configurable or dynamic
      for (let i = 0; i < postsToProcess.length; i += batchSize) {
        const batch = postsToProcess.slice(i, i + batchSize);
        await Promise.all(
          batch.map((post) => {
            if (typeof post.id === "number") {
              // generateImages will handle its own processing state and image_status updates
              return generateImages(post.id);
            }
            return Promise.resolve();
          })
        );

        if (i + batchSize < postsToProcess.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay between batches
        }
      }

      toast({
        title: "Image Generation Started",
        description: `Image generation process initiated for ${postsToProcess.length} posts.`,
      });

    } catch (error) {
      console.error("Error in handleGenerateAllImages:", error);
      toast({
        title: "Error Generating Images",
        description: "An unexpected error occurred while trying to generate all images. Please check the console for more details.",
        variant: "destructive",
      });
      // Attempt to revert UI state for posts that were marked as processing by this function
      setLocalPosts(prevPosts =>
        prevPosts.map(p => {
          if (postsToProcessGlobal.find(ptp => ptp.id === p.id) && p.image_status === "generating") {
            return { ...p, image_status: "pending" }; // Revert to "pending"
          }
          return p;
        })
      );
      // More sophisticated error handling for processingPosts might be needed
      // For now, we rely on individual generateImages calls to clear their processing flags on error/completion
    } finally {
      setIsSubmitting(false);
    }
  }, [localPosts, processingPosts, toast, generateImages]);

  // Manual refresh - check all posts
  const manualRefreshUI = useCallback(async () => {
    toast({
      title: "Refreshing",
      description: "Checking for new images...",
    })

    // Check all posts that might have updates
    const postsToCheck = localPosts.filter(
      (post) =>
        // Check posts that are generating
        post.image_status === "generating" ||
        // Check posts that are being processed
        processingPosts[post.id] ||
        // Also check completed posts that don't have images yet
        (post.image_status === "completed" && !hasRealImages(post)),
    )

    if (postsToCheck.length === 0) {
      toast({
        title: "No updates needed",
        description: "No posts need refreshing.",
      })
      return
    }

    // Check posts
    let updatedCount = 0

    for (const post of postsToCheck) {
      if (typeof post.id === "number") {
        const updated = await checkImageStatus(post.id)
        if (updated) updatedCount++
      }
    }

    toast({
      title: "Refresh complete",
      description: updatedCount > 0 ? `Updated ${updatedCount} posts with new images.` : "No new images found.",
    })

    // forceRefresh() // Removed
  }, [localPosts, processingPosts, toast, checkImageStatus, hasRealImages])

  // Toggle image selection
  const toggleImageSelection = useCallback(async (postId: number, imageIndex: number) => {
    setLocalPosts((posts) => {
      const updatedPosts = posts.map((post) => {
        if (post.id === postId && post.images) {
          try {
            const imagesData = JSON.parse(post.images)
            const images = imagesData.images || []

            // Skip blob URLs
            if (images[imageIndex]?.url?.startsWith("blob:")) {
              return post
            }

            // Toggle selection
            const updatedImages = images.map((img, idx) => ({
              ...img,
              isSelected: idx === imageIndex ? !img.isSelected : img.isSelected,
            }))

            // Update main image URL
            let newImageUrl = post.imageUrl

            // If toggling ON, make it the main image
            if (updatedImages[imageIndex].isSelected) {
              newImageUrl = updatedImages[imageIndex].url
            }
            // If toggling OFF and it was the main image, find another selected image
            else if (post.imageUrl === images[imageIndex].url) {
              const firstSelected = updatedImages.find((img) => img.isSelected)
              newImageUrl = firstSelected ? firstSelected.url : post.imageUrl
            }

            return {
              ...post,
              images: JSON.stringify({ ...imagesData, images: updatedImages }),
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
            const images = imagesData.images || []
            const selectedImages = images.filter((img) => img.isSelected)

            // Get main image URL
            const mainImageUrl = selectedImages.length > 0 ? selectedImages[0].url : updatedPost.imageUrl

            await saveImageSelection(postId, updatedPost.images, mainImageUrl)
          } catch (error) {
            console.error("Error saving image selection:", error)
          }
        }, 0)
      }

      return updatedPosts
    })
  }, [])

  // Handle completion
  const handleComplete = useCallback(async () => {
    setIsSubmitting(true)

    try {
      // Save selections to database
      for (const post of localPosts) {
        if (typeof post.id === "number" && post.images) {
          try {
            const imagesData = JSON.parse(post.images)
            const images = imagesData.images || []

            // Filter valid selected images
            const validSelectedImages = images.filter(
              (img) => img.isSelected && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url),
            )

            // Only save if there are selected non-placeholder images
            if (validSelectedImages.length > 0 && !validSelectedImages[0].url.includes("placeholder.svg")) {
              const mainImageUrl = validSelectedImages[0].url

              await saveImageSelection(post.id, post.images, mainImageUrl)
            }
          } catch (e) {
            console.error("Error saving final image selection:", e)
          }
        }
      }

      // Call onComplete
      onComplete(localPosts)
    } catch (error) {
      console.error("Error completing image generation:", error)
      toast({
        title: "Error",
        description: "Failed to save generated images",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [localPosts, toast, onComplete])

  // Update settings
  const updateSetting = useCallback((postId: string | number, setting: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        [setting]: value,
      },
    }))
  }, [])

  // Initial check for completed posts without images
  useEffect(() => {
    // Find posts that are marked as completed but don't have real images
    const completedPostsWithoutImages = localPosts.filter(
      (post) => post.image_status === "completed" && !hasRealImages(post),
    )

    // Check these posts for images
    if (completedPostsWithoutImages.length > 0) {
      completedPostsWithoutImages.forEach((post) => {
        if (typeof post.id === "number") {
          checkImageStatus(post.id)
        }
      })
    }
  }, [localPosts, hasRealImages, checkImageStatus])

  // Calculate status summary
  const statusSummary = {
    total: localPosts.length,
    completed: localPosts.filter((post) => post.image_status === "completed" && hasRealImages(post)).length,
    generating: localPosts.filter((post) => post.image_status === "generating" || processingPosts[post.id]).length,
    failed: Object.keys(errorMessages).length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Generate Images</h2>
        <p className="text-gray-700">Generate and select images for your posts</p>
        <UploadButton
        endpoint="imageUploader"
        onClientUploadComplete={(res) => {
          // Do something with the response
          console.log("Files: ", res);
          alert("Upload Completed");
        }}
        onUploadError={(error: Error) => {
          // Do something with the error.
          alert(`ERROR! ${error.message}`);
        }}
      />
      </div>

      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm">
            <span className="font-bold">{localPosts.length}</span> posts to generate images for
          </p>
          <p className="text-xs text-gray-500">
            {statusSummary.completed} completed ·
            {statusSummary.generating > 0 && (
              <span className="text-blue-500"> {statusSummary.generating} generating</span>
            )}
            {statusSummary.failed > 0 && <span className="text-red-500"> · {statusSummary.failed} failed</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={manualRefreshUI}
            disabled={isSubmitting}
            className="py-2 px-4 bg-blue-400 border-2 border-black rounded-md font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Refresh UI
          </button>
          <button
            onClick={handleGenerateAllImages}
            disabled={isProcessingAny || isSubmitting}
            className="py-2 px-4 bg-purple-400 border-2 border-black rounded-md font-medium hover:bg-purple-500 flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessingAny ? (
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
            key={`${post.id}`}
            post={post}
            index={index}
            isGenerating={post.image_status === "generating" || processingPosts[post.id]}
            isPolling={processingPosts[post.id]}
            hasError={!!errorMessages[post.id]}
            errorMessage={errorMessages[post.id]}
            numImages={settings[post.id]?.numImages || 1}
            imageStyle={settings[post.id]?.imageStyle || "realistic"}
            imageService={settings[post.id]?.imageService || "flux"}
            isSubmitting={isSubmitting}
            onRegenerateImages={handleRegenerateImages}
            onToggleImageSelection={toggleImageSelection}
            onChangeNumImages={(id, value) => updateSetting(id, "numImages", value)}
            onChangeImageStyle={(id, style) => updateSetting(id, "imageStyle", style)}
            onChangeImageService={(id, service) => updateSetting(id, "imageService", service)}
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
