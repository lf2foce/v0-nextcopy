"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { CheckCircle, RefreshCw, Loader2, Check, AlertCircle, MinusCircle, PlusCircle, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { checkImageGenerationStatus } from "@/lib/actions_api"
import { MultipleImagesDisplay } from "@/components/multiple-images-display"
import { Button } from "@/components/ui/button"
import { Post } from "@/types"
import { generateImagesForPostApi } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Extended Post type with image data handling
interface ExtendedPost extends Post {
  images?: string      // JSON string containing image data
  imagesJson?: string  // Alternative name for images data
  image?: string       // Single image URL
  imageUrl?: string    // URL of the main image
  defaultImageIndex?: number // Index of the default image
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

export function GenerateMultipleImages({
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [numImagesPerPost, setNumImagesPerPost] = useState<Record<string, number>>({})
  const [imageStylePerPost, setImageStylePerPost] = useState<Record<string, string>>({})
  const [imageServicePerPost, setImageServicePerPost] = useState<Record<string, string[]>>({})
  const [pollingPosts, setPollingPosts] = useState<Record<string, boolean>>({})
  const [completedPosts, setCompletedPosts] = useState<Record<string, boolean>>({})
  const [pollingTimers, setPollingTimers] = useState<Record<string, NodeJS.Timeout>>({})
  const [refreshCounter, setRefreshCounter] = useState(0)
  const [globalSelectedStyle, setGlobalSelectedStyle] = useState<string>("realistic")
  const [globalStyleDropdownOpen, setGlobalStyleDropdownOpen] = useState(false)
  const [globalSelectedService, setGlobalSelectedService] = useState<string>("ideogram")
  const [globalServiceDropdownOpen, setGlobalServiceDropdownOpen] = useState(false)
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})
  const [openServiceDropdowns, setOpenServiceDropdowns] = useState<Record<string, boolean>>({})
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const { toast } = useToast()

  // Compute whether any post is being polled
  const isAnyPostPolling = Object.values(pollingPosts).some(value => value)

  // Create a ref to store the current localPosts state for use in polling callbacks
  const localPostsRef = useRef<ExtendedPost[]>([])

  // Update the ref whenever localPosts changes
  useEffect(() => {
    localPostsRef.current = localPosts
  }, [localPosts])

  // Update the state initialization
  const [initialNumImages, setInitialNumImages] = useState<Record<string, number>>({});
  const [initialImageStyles, setInitialImageStyles] = useState<Record<string, string>>({});
  const [initialImageServices, setInitialImageServices] = useState<Record<string, string[]>>({});

  // Initialize the state with post data
  useEffect(() => {
    const initialNumImages: Record<string, number> = {};
    const initialImageStyles: Record<string, string> = {};
    const initialImageServices: Record<string, string[]> = {};
    
    posts.forEach((post) => {
      const postId = getStringId(post.id);
      initialNumImages[postId] = 1;
      initialImageStyles[postId] = "realistic";
      initialImageServices[postId] = [];
    });

    setInitialNumImages(initialNumImages);
    setInitialImageStyles(initialImageStyles);
    setInitialImageServices(initialImageServices);
  }, [posts]);

  // Parse images from JSON string
  const getPostImages = (post: ExtendedPost): PostImage[] => {
    try {
      // Handle case where post.images might not exist
      const imagesJson = post.images || post.imagesJson || "[]"
      const images: PostImage[] = typeof imagesJson === 'string' ? JSON.parse(imagesJson) : imagesJson
      return Array.isArray(images) ? images : []
    } catch (error) {
      console.error("Error parsing post images:", error)
      return []
    }
  }

  // Check if a post has real images (not placeholders)
  const hasRealImages = (post: ExtendedPost): boolean => {
    const images = getPostImages(post)
    if (images.length === 0) return false
    // Check if any image has a real URL (not a placeholder)
    return images.some((img) => img.url && !img.url.includes("placeholder"))
  }

  // Function to save image selection to database
  const saveImageSelectionToDatabase = async (post: ExtendedPost, selectedImages: string[]) => {
    try {
      const stringId = getStringId(post.id)
      const response = await fetch(`/api/posts/${stringId}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ images: selectedImages }),
      })

      if (!response.ok) {
        throw new Error('Failed to save image selection')
      }

      return await response.json()
    } catch (error) {
      console.error('Error saving image selection:', error)
      throw error
    }
  }

  // Get selected images count for a post
  const getSelectedImagesCount = (post: ExtendedPost): number => {
    const images = getPostImages(post)
    return images.filter((img) => img.isSelected).length
  }

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

  // Initialize posts with placeholder images if they don't have images
  useEffect(() => {
    // Initialize posts with the provided posts to preserve selection state
    const updatedPosts = posts.map((post) => {
      // If the post already has images with selection state, keep it
      if ((post.images || post.imagesJson) && hasRealImages(post)) {
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

  // Function to update post with new images
  const updatePostWithImages = useCallback(
    (postId: string, images: any[]) => {
      const formattedData = {
        images: images.map((img, idx) => ({
          ...img,
          isSelected: true,
          order: idx,
        })),
      }

      setLocalPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id.toString() === postId) {
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

      toast({
        title: "Images ready",
        description: `Images for post ${postId} have been generated successfully.`,
      })
    },
    [toast]
  )

  // Function to start polling for image generation
  const startPolling = useCallback(
    (postId: string) => {
      setPollingPosts((prev) => ({
        ...prev,
        [postId]: true,
      }))

      const pollInterval = setInterval(async () => {
        try {
          const result = await checkImageGenerationStatus(postId)
          if (result.success && result.data?.images?.length > 0) {
            clearInterval(pollInterval)
            updatePostWithImages(postId, result.data.images)
          }
        } catch (error) {
          console.error(`Error polling for post ${postId}:`, error)
          clearInterval(pollInterval)
          setErrors((prev) => ({
            ...prev,
            [postId]: "Error checking image status",
          }))
          setPollingPosts((prev) => {
            const newState = { ...prev }
            delete newState[postId]
            return newState
          })
        }
      }, 4000)

      return () => clearInterval(pollInterval)
    },
    [updatePostWithImages]
  )

  // Toggle dropdown
  const toggleDropdown = (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenDropdowns((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Toggle service dropdown
  const toggleServiceDropdown = (postId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenServiceDropdowns((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Toggle global style dropdown
  const toggleGlobalStyleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setGlobalStyleDropdownOpen(prev => !prev)
  }, [])

  // Toggle global service dropdown
  const toggleGlobalServiceDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setGlobalServiceDropdownOpen(prev => !prev)
  }, [])

  // Select image style
  const selectImageStyle = (postId: string, style: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setImageStylePerPost((prev) => ({
      ...prev,
      [postId]: style,
    }));
    setOpenDropdowns((prev) => ({
      ...prev,
      [postId]: false,
    }));
  };

  // Select image service
  const selectImageService = (postId: string, service: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setImageServicePerPost((prev) => ({
      ...prev,
      [postId]: [service],
    }));
    setOpenServiceDropdowns((prev) => ({
      ...prev,
      [postId]: false,
    }));
  };

  // Select global style
  const selectGlobalStyle = useCallback((style: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setGlobalSelectedStyle(style)
    setGlobalStyleDropdownOpen(false)
  }, [])

  // Select global service
  const selectGlobalService = useCallback((service: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setGlobalSelectedService(service)
    setGlobalServiceDropdownOpen(false)
  }, [])

  // Function to increment number of images
  const incrementNumImages = (postId: string) => {
    setNumImagesPerPost((prev) => ({
      ...prev,
      [postId]: Math.min((prev[postId] || 1) + 1, 10),
    }));
  };

  // Function to decrement number of images
  const decrementNumImages = (postId: string) => {
    setNumImagesPerPost((prev) => ({
      ...prev,
      [postId]: Math.max((prev[postId] || 1) - 1, 1),
    }));
  };

  // Force UI refresh function
  const forceUIRefresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1)
  }, [])

  // Function to check image generation status
  const checkImageGenerationStatus = async (postId: string) => {
    try {
      const response = await fetch(`/api/images/status?postId=${postId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error("Error checking image status:", error)
      return { success: false, error: "Failed to check image status" }
    }
  }

  // State management functions
  const handleNumImagesChange = (postId: string | number, value: number) => {
    const stringId = getStringId(postId);
    setNumImagesPerPost((prev) => ({
      ...prev,
      [stringId]: value,
    }));
  };

  const handleImageStyleChange = (postId: string | number, value: string) => {
    const stringId = getStringId(postId);
    setImageStylePerPost((prev) => ({
      ...prev,
      [stringId]: value,
    }));
  };

  const handleImageServiceChange = (postId: string | number, value: string[]) => {
    const stringId = getStringId(postId);
    setImageServicePerPost((prev) => ({
      ...prev,
      [stringId]: value,
    }));
  };

  // Error handling
  const handleGenerationError = (postId: string | number, error: string) => {
    const stringId = getStringId(postId);
    setErrors((prev) => ({
      ...prev,
      [stringId]: error,
    }));
  };

  // Core function to generate images for a post
  const generateImagesForPost = async (post: ExtendedPost) => {
    const stringId = getStringId(post.id);
    try {
      setGeneratingPostId(stringId);
      setErrors(prev => {
        const newState = { ...prev };
        delete newState[stringId];
        return newState;
      });

      // Start polling for this post
      startPolling(stringId);

      // Call the API with numeric ID
      const result = await generateImagesForPostApi(
        getNumericId(post.id),
        numImagesPerPost[stringId] || 1,
        imageStylePerPost[stringId] || "realistic",
        imageServicePerPost[stringId]?.[0]
      );

      if (!result) {
        throw new Error('Failed to generate images');
      }

      // Update completed posts
      setCompletedPosts(prev => ({
        ...prev,
        [stringId]: true
      }));

      return { success: true, status: "processing" };
    } catch (error) {
      console.error(`Error generating images for post ${stringId}:`, error);
      handleGenerationError(stringId, "Failed to generate images");
      return { success: false, status: "error" };
    } finally {
      setGeneratingPostId(null);
    }
  };

  // Function to regenerate images for a specific post
  const regenerateImages = async (post: ExtendedPost) => {
    const stringId = getStringId(post.id)
    setGeneratingPostId(stringId)
    
    try {
      const result = await generateImagesForPost(post)
      if (!result.success) {
        toast({
          title: "Error",
          description: `Failed to regenerate images for post ${stringId}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error regenerating images for post ${stringId}:`, error)
      toast({
        title: "Error",
        description: "Failed to regenerate images",
        variant: "destructive",
      })
    } finally {
      setGeneratingPostId(null)
    }
  }

  // Function to handle completion
  const handleComplete = () => {
    // Check if any posts are missing images
    const postsWithoutImages = localPosts.filter(post => !hasRealImages(post))
    
    if (postsWithoutImages.length > 0 && !allowMissingImages) {
      toast({
        title: "Missing images",
        description: "Some posts are missing images. Please generate images for all posts before continuing.",
        variant: "destructive"
      })
      return
    }

    onComplete(localPosts)
  }

  // Function to handle back
  const handleBack = () => {
    onBack()
  }

  // Function to handle refresh
  const handleRefresh = () => {
    forceUIRefresh()
  }

  // Function to handle generate all
  const handleGenerateAll = async () => {
    setIsSubmitting(true)
    try {
      const postsToGenerate = localPosts.filter(post => !hasRealImages(post))
      
      for (const post of postsToGenerate) {
        await generateImagesForPost(post)
      }
      
      toast({
        title: "Success",
        description: "Started generating images for all posts",
      })
    } catch (error) {
      console.error("Error generating all images:", error)
      toast({
        title: "Error",
        description: "Failed to generate images for all posts",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to handle regenerate
  const handleRegenerate = async (post: ExtendedPost) => {
    await regenerateImages(post)
  }

  // Clean up polling timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingTimers).forEach(timerId => {
        clearInterval(timerId)
      })
    }
  }, [pollingTimers])

  // Function to handle image selection
  const handleImageSelection = async (post: ExtendedPost, selectedImages: string[]) => {
    try {
      await saveImageSelectionToDatabase(post, selectedImages)
      // ... rest of the function
    } catch (error) {
      console.error('Error in handleImageSelection:', error)
      // ... error handling
    }
  }

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

            {/* Apply global settings automatically when they change */}
          </div>

          <button
            onClick={handleRefresh}
            className="py-2 px-4 bg-blue-400 border-2 border-black rounded-md font-medium hover:bg-blue-500 flex items-center gap-1"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={handleGenerateAll}
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
          const stringId = getStringId(post.id);
          const isGeneratingThisPost = generatingPostId === stringId
          const isPollingThisPost = pollingPosts[stringId] === true
          const postImages = getPostImages(post)
          const hasImages = postImages.length > 0
          const selectedCount = getSelectedImagesCount(post)
          const hasGeneratedImages = hasRealImages(post)
          const hasError = errors[stringId]
          const numImages = numImagesPerPost[stringId] || 1
          const imageStyle = imageStylePerPost[stringId] || "realistic"
          const isDropdownOpen = openDropdowns[stringId] || false
          const isGeneratingOrPolling = isGeneratingThisPost || isPollingThisPost
          const isCompleted = completedPosts[stringId] === true

          return (
            <div
              key={stringId}
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
                        onClick={() => decrementNumImages(stringId)}
                        disabled={numImages <= 1 || isGeneratingOrPolling}
                        className="text-black hover:bg-gray-100 rounded-full p-1 disabled:opacity-50 transition-colors"
                        title="Decrease number of images"
                      >
                        <MinusCircle size={16} />
                      </button>
                      <span className="text-sm font-bold w-5 text-center">{numImages}</span>
                      <button
                        onClick={() => incrementNumImages(stringId)}
                        disabled={numImages >= 10 || isGeneratingOrPolling}
                        className="text-black hover:bg-gray-100 rounded-full p-1 disabled:opacity-50 transition-colors"
                        title="Increase number of images"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>

                    {/* Style selector dropdown */}
                    <div className="relative" ref={(el) => {
                      dropdownRefs.current[stringId] = el;
                      return undefined;
                    }}>
                      <button
                        onClick={(e) => toggleDropdown(stringId, e)}
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
                              onClick={(e) => selectImageStyle(stringId, style.value, e)}
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
                      dropdownRefs.current[`service_${stringId}`] = el;
                      return undefined;
                    }}>
                      <button
                        onClick={(e) => toggleServiceDropdown(stringId, e)}
                        disabled={isGeneratingOrPolling}
                        className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1 text-sm w-40 disabled:opacity-50 transition-colors hover:bg-gray-50"
                      >
                        <span className="text-xs text-gray-500 mr-1">Service:</span>
                        <span className="font-medium truncate">
                          {IMAGE_SERVICES.find((service) => service.value === (imageServicePerPost[stringId]?.[0] || "ideogram"))?.label || "Ideogram"}
                        </span>
                        <ChevronDown size={14} className={`transition-transform ${openServiceDropdowns[stringId] ? "transform rotate-180" : ""}`} />
                      </button>

                      {openServiceDropdowns[stringId] && (
                        <div className="absolute z-10 mt-1 w-48 bg-white border-2 border-black rounded-md shadow-lg">
                          {IMAGE_SERVICES.map((service) => (
                            <button
                              key={service.value}
                              onClick={(e) => selectImageService(stringId, service.value, e)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors ${
                                (imageServicePerPost[stringId]?.[0] || "ideogram") === service.value ? "bg-yellow-100 font-medium" : ""
                              }`}
                            >
                              {service.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleRegenerate(post)}
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
                      onClick={() => handleRegenerate(post)}
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
                          onClick={() => handleImageSelection(post, [image.url])}
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
                      onClick={() => handleRegenerate(post)}
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
          onClick={handleBack}
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

