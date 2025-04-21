"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import Image from "next/image"
import { Post } from "@/types"
import { CheckCircle, RefreshCw, Loader2, Check, AlertCircle, MinusCircle, PlusCircle, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { checkImageGenerationStatus } from "@/lib/actions_api"
import { MultipleImagesDisplay } from "@/components/multiple-images-display"
import { Button } from "@/components/ui/button"
import { generateImagesForPostApi } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Extended Post type with image data handling
interface ExtendedPost extends Post {
  // No need to redefine properties that are already in Post type
}

// Define the image object structure
interface PostImage {
  url: string
  prompt: string
  order: number
  isSelected: boolean
  metadata?: {
    width: number
    height: number
    style: string
  }
}

// Define image style type
interface ImageStyle {
  value: string
  label: string
}

// Define image service type
interface ImageService {
  value: string
  label: string
}

// Define available image styles
const IMAGE_STYLES: ImageStyle[] = [
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
const IMAGE_SERVICES: ImageService[] = [
  { value: "ideogram", label: "Ideogram" },
  { value: "gemini", label: "Gemini" },
  { value: "flux", label: "Flux" },
]

interface GenerateMultipleImagesProps {
  posts: ExtendedPost[]
  onComplete: (posts: ExtendedPost[]) => void
  onBack: () => void
  allowMissingImages?: boolean
}

// Helper functions for consistent ID handling
const getStringId = (id: string | number): string => {
  return String(id);
};

const getNumericId = (id: string | number): number => {
  return typeof id === 'string' ? parseInt(id, 10) : id;
};

export default function GenerateMultipleImages({
  posts,
  onComplete,
  onBack,
  allowMissingImages = true,
}: GenerateMultipleImagesProps) {
  const [localPosts, setLocalPosts] = useState<ExtendedPost[]>(posts)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingPostId, setGeneratingPostId] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string>("realistic")
  const [selectedService, setSelectedService] = useState<string>("ideogram")
  const [isPolling, setIsPolling] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Default state initialization
  const [numImagesPerPost, setNumImagesPerPost] = useState<Record<string, number>>(() => {
    const initialState: Record<string, number> = {};
    posts.forEach(post => {
      initialState[getStringId(post.id)] = 1;
    });
    return initialState;
  });
  
  const [imageStylePerPost, setImageStylePerPost] = useState<Record<string, string>>(() => {
    const initialState: Record<string, string> = {};
    posts.forEach(post => {
      initialState[getStringId(post.id)] = "realistic";
    });
    return initialState;
  });
  
  const [imageServicePerPost, setImageServicePerPost] = useState<Record<string, string>>(() => {
    const initialState: Record<string, string> = {};
    posts.forEach(post => {
      initialState[getStringId(post.id)] = "ideogram";
    });
    return initialState;
  });
  
  // Track initialized posts
  const previousPostsRef = useRef<string[]>([]);
  
  // Update state for new posts
  useEffect(() => {
    const currentPostIds = posts.map(post => getStringId(post.id));
    const newPostIds = currentPostIds.filter(id => !previousPostsRef.current.includes(id));
    
    if (newPostIds.length > 0) {
      previousPostsRef.current = currentPostIds;
      
      setNumImagesPerPost(prev => {
        const newState = {...prev};
        newPostIds.forEach(id => {
          newState[id] = 1;
        });
        return newState;
      });
      
      setImageStylePerPost(prev => {
        const newState = {...prev};
        newPostIds.forEach(id => {
          newState[id] = "realistic";
        });
        return newState;
      });
      
      setImageServicePerPost(prev => {
        const newState = {...prev};
        newPostIds.forEach(id => {
          newState[id] = "ideogram";
        });
        return newState;
      });
    }
  }, [posts]);
  
  const [pollingPosts, setPollingPosts] = useState<Record<string, boolean>>({})
  const [completedPosts, setCompletedPosts] = useState<Record<string, boolean>>({})
  const [pollingTimers, setPollingTimers] = useState<Record<string, NodeJS.Timeout>>({})
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [globalSelectedStyle, setGlobalSelectedStyle] = useState<string>("realistic")
  const [globalSelectedService, setGlobalSelectedService] = useState<string>("ideogram")
  const { toast } = useToast()

  // Create a ref to store the current localPosts state for use in polling callbacks
  const localPostsRef = useRef<Post[]>([])
  // Store previous errors to compare
  const prevErrorsRef = useRef<Record<string, string>>({});

  // Update the ref whenever localPosts changes
  useEffect(() => {
    localPostsRef.current = localPosts
  }, [localPosts])

  // Functions for image quantity controls
  const incrementNumImages = (postId: string) => {
    setNumImagesPerPost((prev) => {
      const currentValue = prev[postId] || 1
      return { ...prev, [postId]: Math.min(currentValue + 1, 10) }
    })
  }

  const decrementNumImages = (postId: string) => {
    setNumImagesPerPost((prev) => {
      const currentValue = prev[postId] || 1
      return { ...prev, [postId]: Math.max(currentValue - 1, 1) }
    })
  }

  // Function to select image style
  const selectImageStyle = useCallback((value: string, postId: string) => {
    setImageStylePerPost(prev => {
      // If value hasn't changed, don't update state
      if (prev[postId] === value) return prev;
      return { ...prev, [postId]: value };
    });
  }, []);

  // Function to select image service
  const selectImageService = useCallback((value: string, postId: string) => {
    setImageServicePerPost(prev => {
      // If value hasn't changed, don't update state
      if (prev[postId] === value) return prev;
      return { ...prev, [postId]: value };
    });
  }, []);

  // Function to select global style and apply to all posts
  const selectGlobalStyle = useCallback((value: string) => {
    // Only update if different from current value
    if (globalSelectedStyle === value) return;
    
    setGlobalSelectedStyle(value);
    
    setImageStylePerPost(prev => {
      const newState = {...prev};
      let changed = false;
      
      posts.forEach(post => {
        const postId = getStringId(post.id);
        if (newState[postId] !== value) {
          newState[postId] = value;
          changed = true;
        }
      });
      
      // Only return new state if something changed
      return changed ? newState : prev;
    });
  }, [posts, globalSelectedStyle]);

  // Function to select global service and apply to all posts
  const selectGlobalService = useCallback((value: string) => {
    // Only update if different from current value
    if (globalSelectedService === value) return;
    
    setGlobalSelectedService(value);
    
    setImageServicePerPost(prev => {
      const newState = {...prev};
      let changed = false;
      
      posts.forEach(post => {
        const postId = getStringId(post.id);
        if (prev[postId] !== value) {
          newState[postId] = value;
          changed = true;
        }
      });
      
      // Only return new state if something changed
      return changed ? newState : prev;
    });
  }, [posts, globalSelectedService]);

  // Function to force a UI refresh
  const forceUIRefresh = useCallback(() => {
    setRefreshCounter((prev) => prev + 1)
  }, []);

  // Function to update post with new images
  const updatePostWithImages = useCallback((postId: string, images: PostImage[]) => {
      const formattedData = {
        images: images.map((img, idx) => ({
          ...img,
        isSelected: true,
          order: idx,
        })),
      }

    setLocalPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (getStringId(post.id) === postId) {
            return {
              ...post,
            images: JSON.stringify(formattedData),
              imageUrl: images[0]?.url || post.imageUrl,
            }
          }
          return post
        })
    )

    setPollingPosts((prev) => {
      const newState = { ...prev }
      delete newState[postId]
      return newState
    })

      setErrors((prev) => {
      const newState = { ...prev }
      delete newState[postId]
      return newState
    })
  }, [])

  // Completely rewritten polling function to ensure each post updates independently
  const startPolling = useCallback(
    (postId: number) => {
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
          const result = await checkImageGenerationStatus(postId)

          if (result.success && result.data) {
            // If we have images or the status is complete
            if (result.data.hasImages || result.data.isComplete) {
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
                updatePostWithImages(postId.toString(), result.data.images)

                // Show success toast
                toast({
                  title: "Images ready",
                  description: `Images for post ${postId} have been generated successfully.`,
                })
              } else {
                // Try one more direct fetch to get images
                try {
                  const directResult = await checkImageGenerationStatus(postId)
                  if (directResult.success && directResult.data && directResult.data.images && directResult.data.images.length > 0) {
                    updatePostWithImages(postId.toString(), directResult.data.images)
                  }
                } catch (e) {
                  // Error in final fetch attempt
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
          // Handle error situations
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
      // Store the reference to the current polling posts
      const currentPollingPostIds = Object.keys(pollingPosts);
      
      const refreshTimer = setInterval(async () => {
        // Check all posts that are being polled
        for (const postIdStr of currentPollingPostIds) {
          const postId = Number(postIdStr);
          if (!isNaN(postId)) {
            try {
              console.log(`Auto-checking status for post ${postId}`);
              const result = await checkImageGenerationStatus(postId);

              // Only update state if still polling this specific post
              // (avoids updating for posts that were already completed)
              if (pollingPosts[postId] && result.success && result.data && 
                  result.data.hasImages && result.data.images?.length > 0) {
                console.log(`Found images for post ${postId} during auto-refresh`);
                
                // Update the post with the new images
                updatePostWithImages(postId.toString(), result.data.images);

                // Also save to database immediately to ensure persistence
                try {
                  const { updatePostImages } = await import("@/lib/actions");
                  const formattedData = {
                    images: result.data.images.map((img: any, idx: number) => ({
                      ...img,
                      isSelected: true, // Mark all as selected by default
                      order: idx,
                    })),
                  };

                  await updatePostImages([
                    {
                      id: postId,
                      image: result.data.images[0]?.url || "",
                      imagesJson: JSON.stringify(formattedData),
                    },
                  ]);
                  console.log("Successfully saved auto-refreshed images to database for post:", postId);
                  
                  // Clear polling timers for this post
                if (pollingTimers[postId]) {
                    clearInterval(pollingTimers[postId]);
                  }
                  
                  // Update polling state in a single update
                  const timer = pollingTimers[postId];
                  setPollingTimers(prev => {
                    const newState = { ...prev };
                    delete newState[postId];
                    return newState;
                  });
                  
                  setPollingPosts(prev => {
                    const newState = { ...prev };
                    delete newState[postId];
                    return newState;
                  });
                } catch (error) {
                  console.error("Error saving auto-refreshed images to database:", error);
                }
              }
            } catch (e) {
              console.error(`Error checking status for post ${postId} during auto-refresh:`, e);
            }
          }
        }
      }, 2500); // Giảm tần suất kiểm tra xuống mỗi 2.5 giây

      return () => clearInterval(refreshTimer);
    }
  }, [pollingPosts]); // Chỉ phụ thuộc vào pollingPosts

  // Function to generate placeholder images for a post
  const generatePlaceholderImages = (postId: string | number): PostImage[] => {
    const imageStyles = ["photorealistic", "artistic", "cartoon", "sketch", "abstract"]
    const images: PostImage[] = []

    for (let i = 0; i < 1; i++) {
      // Default to 1 placeholder image
      const style = imageStyles[i % imageStyles.length]

      images.push({
        url: `/placeholder.svg?height=300&width=400&text=Placeholder_${style}`,
        prompt: `Placeholder image ${i + 1} for post ${getStringId(postId)}`,
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
  const getPostImages = (post: ExtendedPost): PostImage[] => {
    // Handle case where post.images might not exist
    const imagesJson = post.images || post.imagesJson || post.image || ""
    if (!imagesJson) return []

    try {
      // Try to parse the images JSON
      const imagesData = JSON.parse(typeof imagesJson === 'string' ? imagesJson : '{}')
      // Handle both direct images array and nested images structure
      return imagesData.images?.images || imagesData.images || []
    } catch (e) {
      console.error("Error parsing images JSON:", e)
      return []
    }
  }

  // Check if a post has real images (not placeholders)
  const hasRealImages = (post: ExtendedPost): boolean => {
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
      if ((post.images || post.imagesJson) && getPostImages(post).some((img) => !img.url.includes("placeholder.svg"))) {
        return post
      }

      // Otherwise add placeholder images
      const placeholderImages = generatePlaceholderImages(getStringId(post.id))
      return {
        ...post,
        images: JSON.stringify({ images: placeholderImages }),
      }
    })

    setLocalPosts(updatedPosts)
  }, [posts]) // Remove hasRealImages from dependencies

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
        const imageService = imageServicePerPost[postId] || "ideogram"

        // Skip if this post is already being polled
        if (pollingPosts[postId]) {
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
          updatePostWithImages(postId.toString(), result.data.images)

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
    const stringId = getStringId(postId)
    setGeneratingPostId(stringId)

    // Remove from completed posts if it was previously completed
    setCompletedPosts((prev) => {
      const newState = { ...prev }
      delete newState[stringId]
      return newState
    })

    // Clear any existing images for this post before regenerating
    if (typeof postId === "number") {
      // Clear the images in local state first for immediate UI feedback
      setLocalPosts((prevPosts) => {
        return prevPosts.map((p) => {
          if (p.id === postId) {
            // Generate a placeholder while waiting for new images
            const placeholderImages = generatePlaceholderImages(stringId)
            return {
              ...p,
              images: JSON.stringify({ images: placeholderImages }),
            }
          }
          return p
        })
      })

      // Also clear images in the database to ensure they're completely replaced
      try {
        const { updatePostImages } = await import("@/lib/actions")
        const placeholderImages = generatePlaceholderImages(stringId)
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
  const handleGenerateAllImages = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (isGenerating) return
    
    setIsGenerating(true)
    
    // Keep track of pending posts
    const pending = [...localPosts]
      .filter(post => !completedPosts[post.id] && !pollingPosts[post.id])
      .map(post => post.id)
    
    if (pending.length === 0) {
      setIsGenerating(false)
      return
    }
    
    // Generate for each pending post
    for (const postId of pending) {
      if (errors[postId]) {
        // Skip posts with errors
          continue
        }

      await generateImagesForPost(postId)
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
      setIsGenerating(false)
  }

  // Function to manually refresh the UI
  const manualForceUIRefresh = () => {
    // Force a UI refresh by checking the status of all polling posts
    Object.keys(pollingPosts).forEach(postIdStr => {
      const postId = getNumericId(postIdStr)
      if (pollingPosts[postIdStr]) {
        checkImageGenerationStatus(postId)
      }
    })
  }

  // Function to toggle image selected state
  const toggleImageSelected = useCallback((postId: string | number, imageIndex: number) => {
    const stringId = getStringId(postId)
    setLocalPosts((prevPosts) => {
      return prevPosts.map((post) => {
        if (getStringId(post.id) === stringId) {
          // Get the current images
          const currentPost = post as ExtendedPost
          if (!currentPost.images && !currentPost.imagesJson) return post
          
          const imagesJson = currentPost.images || currentPost.imagesJson || ""
          try {
            const imagesData = JSON.parse(imagesJson)
            const images = imagesData.images || []
            
            // Toggle the selected state
            const updatedImages = images.map((img: PostImage, idx: number) => ({
              ...img,
              isSelected: idx === imageIndex ? !img.isSelected : img.isSelected,
            }))

            // Create updated JSON
            const updatedImagesJson = JSON.stringify({
              images: updatedImages,
            })

            // Return updated post
            return {
              ...post,
              images: updatedImagesJson,
              imagesJson: updatedImagesJson,
            } as ExtendedPost
          } catch (e) {
            console.error(`Error toggling image selected state for post ${stringId}:`, e)
            return post
          }
        }
        return post
      })
    })
  }, [])

  // Get selected images count for a post
  const getSelectedImagesCount = (post: ExtendedPost): number => {
    try {
      const currentPost = post as ExtendedPost
      if (!currentPost.images && !currentPost.imagesJson) return 0
      
      const imagesJson = currentPost.images || currentPost.imagesJson || ""
      const imagesData = JSON.parse(imagesJson)
      const images = imagesData.images || []
      
      return images.filter((img: PostImage) => img.isSelected).length
          } catch (e) {
      console.error(`Error getting selected images count:`, e)
      return 0
    }
  }

  // Check if any posts are currently being polled
  const isAnyPostPolling = useMemo(() => 
    Object.values(pollingPosts).some((value) => value === true)
  , [pollingPosts]);

  // Simple error handling without automatic retry
  useEffect(() => {
    // Just display errors without retrying automatically
    Object.entries(errors).forEach(([postId, errorMsg]) => {
      // Only show toast for new errors that didn't exist before
      if (typeof Number(postId) === "number" && !isNaN(Number(postId)) && 
          prevErrorsRef.current[postId] !== errorMsg) {
        console.log(`Error detected for post ${postId}: ${errorMsg}`)
        
        // Update the previous errors reference
        prevErrorsRef.current[postId] = errorMsg;

        // Show toast notification about the error
        toast({
          title: "Image generation failed",
          description: `Failed to generate image for post ${postId}. Please try manually.`,
          variant: "destructive"
        })
      }
    })
  }, [errors, toast])

  // Update the rendering part to show polling status and style dropdown
  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden px-2 sm:px-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-black mb-2">Generate Images</h2>
        <p className="text-gray-700 text-sm sm:text-base">Generate and select images for your posts</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <p className="text-sm">
          <span className="font-bold">{localPosts.length}</span> posts to generate images for
        </p>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
          {/* Global selectors container */}
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-2 rounded-lg border-2 border-black w-full sm:w-auto">
            {/* Global image style selector */}
            <div className="flex items-center ml-2">
              <span className="text-sm font-medium mr-2">Style:</span>
              <Select
                value={globalSelectedStyle}
                onValueChange={selectGlobalStyle}
              >
                <SelectTrigger className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1.5 text-sm w-40">
                  <SelectValue placeholder={IMAGE_STYLES.find(s => s.value === globalSelectedStyle)?.label || "Realistic"} />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Global image service selector */}
            <div className="flex items-center ml-2">
              <span className="text-sm font-medium mr-2">Service:</span>
              <Select
                value={globalSelectedService}
                onValueChange={selectGlobalService}
              >
                <SelectTrigger className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1.5 text-sm w-40">
                  <SelectValue placeholder={IMAGE_SERVICES.find(s => s.value === globalSelectedService)?.label || "Ideogram"} />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_SERVICES.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Apply global settings automatically when they change */}
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
            disabled={isGenerating || isPolling}
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
            Some posts don&apos;t have selected images. You can continue, but you may want to add images later.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {localPosts.map((post, index) => {
          const postId = getStringId(post.id);
          const isGeneratingThisPost = generatingPostId === postId;
          const isPollingThisPost = pollingPosts[postId] === true;
          const postImages = getPostImages(post);
          const hasImages = postImages.length > 0;
          const selectedCount = getSelectedImagesCount(post);
          const hasGeneratedImages = hasRealImages(post);
          const hasError = errors[postId];
          const numImages = numImagesPerPost[postId] || 1;
          const imageStyle = imageStylePerPost[postId] || "realistic";
          const isCompleted = completedPosts[postId] === true;
          const isGeneratingOrPolling = isGeneratingThisPost || isPollingThisPost;

          return (
            <div
              key={`${postId}-${refreshCounter}`}
              className="border-4 border-black rounded-md overflow-hidden bg-white shadow-md transition-all hover:shadow-lg"
            >
              <div className="p-2 sm:p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-b-4 border-black flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-0">
                <div className="flex items-center">
                    {isCompleted && <CheckCircle size={16} className="inline ml-2 text-green-500" />}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  {hasGeneratedImages && (
                    <div className="flex items-center px-2 sm:px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                      <span className="text-xs sm:text-sm font-medium text-blue-700">
                        {selectedCount} of {postImages.length} selected
                      </span>
                    </div>
                  )}

                  {/* Image generation controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Number of images selector */}
                    <div className="flex items-center gap-1 sm:gap-2 bg-white border-2 border-black rounded-md px-2 py-1">
                      <span className="text-xs text-gray-500 mr-1">Qty:</span>
                      <button
                        onClick={() => decrementNumImages(postId)}
                        disabled={numImages <= 1 || isGeneratingThisPost || isPollingThisPost}
                        className="text-black hover:bg-gray-100 rounded-full p-1 disabled:opacity-50 transition-colors"
                        title="Decrease number of images"
                      >
                        <MinusCircle size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      <span className="text-xs sm:text-sm font-bold w-4 sm:w-5 text-center">{numImages}</span>
                      <button
                        onClick={() => incrementNumImages(postId)}
                        disabled={numImages >= 10 || isGeneratingThisPost || isPollingThisPost}
                        className="text-black hover:bg-gray-100 rounded-full p-1 disabled:opacity-50 transition-colors"
                        title="Increase number of images"
                      >
                        <PlusCircle size={14} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {/* Style selector */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Select
                        value={
                          imageStylePerPost[postId] ||
                          IMAGE_STYLES[0].value
                        }
                        onValueChange={(value) => selectImageStyle(value, postId)}
                      >
                        <SelectTrigger className="flex items-center justify-between gap-1 bg-white border-2 border-gray-300 rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm w-24 sm:w-36">
                          <SelectValue placeholder={IMAGE_STYLES.find(s => s.value === (imageStylePerPost[postId] || "realistic"))?.label || "Realistic"} />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_STYLES.map((style) => (
                            <SelectItem key={style.value} value={style.value}>
                              {style.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Service selector */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Select
                        value={
                          imageServicePerPost[postId] ||
                          IMAGE_SERVICES[0].value
                        }
                        onValueChange={(value) => selectImageService(value, postId)}
                      >
                        <SelectTrigger className="flex items-center justify-between gap-1 bg-white border-2 border-gray-300 rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm w-24 sm:w-36">
                          <SelectValue placeholder={IMAGE_SERVICES.find(s => s.value === (imageServicePerPost[postId] || "ideogram"))?.label || "Ideogram"} />
                        </SelectTrigger>
                        <SelectContent>
                          {IMAGE_SERVICES.map((service) => (
                            <SelectItem key={service.value} value={service.value}>
                              {service.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRegenerateImages(post.id)}
                    disabled={isGeneratingThisPost || isPollingThisPost}
                    className="py-1 px-3 bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-black rounded-md hover:opacity-90 active:opacity-80 transition-all flex items-center gap-1 text-sm disabled:opacity-50 text-white shadow-sm"
                  >
                    {isGeneratingThisPost ? (
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

              <div className="p-3 sm:p-4">
                {/* Post title and number */}
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-black text-white rounded-full text-xs sm:text-sm font-bold mr-2">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg break-words">
                    {post.title || `Post ${index + 1}`}
                    {isCompleted && <CheckCircle size={14} className="inline ml-2 text-green-500" />}
                  </h3>
              </div>

                {/* Post content display */}
                <div className="mb-4 sm:mb-6 bg-gradient-to-r from-gray-50 to-white p-3 sm:p-4 rounded-lg border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-2">
                    <h4 className="text-xs uppercase text-gray-500 font-semibold tracking-wider bg-blue-50 px-2 py-1 rounded">Post Content</h4>
                  </div>
                  <p className="text-sm sm:text-lg font-medium line-clamp-3">{post.content}</p>
                </div>

                {isGeneratingThisPost ? (
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
                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {postImages.map((image, imageIndex) => (
                        <div
                          key={imageIndex}
                          onClick={() => toggleImageSelected(post.id, imageIndex)}
                          className={`relative border-4 ${
                            image.isSelected
                              ? "border-green-500 ring-4 ring-green-100"
                              : "border-gray-200 hover:border-blue-300"
                          } rounded-lg overflow-hidden h-40 sm:h-52 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl ${
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

      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
        <button
          onClick={onBack}
          disabled={isPolling}
          className="py-2 sm:py-3 px-4 sm:px-6 bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300 disabled:opacity-50 text-sm sm:text-base"
        >
          Back
        </button>
        {!allowMissingImages || localPosts.every((post) => getSelectedImagesCount(post) > 0) ? (
          <button
            onClick={() => onComplete(localPosts)}
            disabled={isPolling}
            className="py-2 sm:py-3 px-4 sm:px-6 bg-green-500 border-2 border-black rounded-md font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isPolling ? (
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
            onClick={() => onComplete(localPosts)}
            disabled={isPolling}
            className="py-2 sm:py-3 px-4 sm:px-6 bg-yellow-500 border-2 border-black rounded-md font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            {isPolling ? (
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
