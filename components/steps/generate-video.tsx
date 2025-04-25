"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import type { Post } from "../campaign-workflow"
import { Loader2, RefreshCw, Play, CheckCircle, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updatePostVideos } from "@/lib/actions"

// Sample video URLs from Google's public video bucket
const sampleVideoUrls = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
]

interface VideoModalProps {
  videoUrl: string
  isOpen: boolean
  onClose: () => void
}

function VideoModal({ videoUrl, isOpen, onClose }: VideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "hidden"

      // Scroll to center of viewport if needed
      if (modalRef.current) {
        setTimeout(() => {
          modalRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          })
        }, 100)
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "auto"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        ref={modalRef}
        className="bg-white border-4 border-black rounded-lg max-w-3xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto my-auto"
        style={{
          position: "relative",
          top: "auto",
          transform: "none",
          margin: "auto",
        }}
      >
        <div className="flex justify-between items-center p-4 border-b-4 border-black">
          <h3 className="text-xl font-bold">Video Preview</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300"
          >
            &times;
          </button>
        </div>
        <div className="p-4">
          <video controls className="w-full border-2 border-black rounded-md" autoPlay>
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  )
}

interface GenerateVideoProps {
  posts: Post[]
  onComplete: (postsWithVideos: Post[]) => void
  onBack: () => void
}

export default function GenerateVideo({ posts, onComplete, onBack }: GenerateVideoProps) {
  const [localPosts, setLocalPosts] = useState<Post[]>(posts)
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [generatingPostId, setGeneratingPostId] = useState<string | number | null>(null)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [allVideosGenerated, setAllVideosGenerated] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null)
  const { toast } = useToast()

  // Progress interval reference
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check if posts already have videos (for when returning to this step)
  useEffect(() => {
    // Initialize localPosts with the provided posts
    const postsWithValidData = posts.map((post) => {
      // Ensure post has at least a placeholder video URL if none exists
      if (!post.videoUrl) {
        return {
          ...post,
          videoUrl: "/placeholder.mp4",
          videoGenerated: false,
        }
      }
      return post
    })

    setLocalPosts(postsWithValidData)

    // Check if ALL posts have valid videos
    const hasAllVideos = postsWithValidData.every((post) => {
      return post.videoUrl && post.videoUrl !== "/placeholder.mp4"
    })

    setAllVideosGenerated(hasAllVideos)
  }, [posts])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Function to generate a real video URL
  const generateVideoUrl = (postId: string | number) => {
    // Get a random video from the sample videos
    const randomIndex = Math.floor(Math.random() * sampleVideoUrls.length)
    return sampleVideoUrls[randomIndex]
  }

  // Function to generate videos for all posts
  const generateAllVideos = async () => {
    setIsGeneratingAll(true)
    setGenerationProgress(0)

    const updatedPosts = [...localPosts]
    const postsToUpdate: { id: number; video: string }[] = []

    // Set up progress interval - increment every 200ms
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    progressIntervalRef.current = setInterval(() => {
      setGenerationProgress((prev) => {
        // Increase by random amount between 1-5%
        const increment = Math.floor(Math.random() * 5) + 1
        const newProgress = Math.min(prev + increment, 95)
        return newProgress
      })
    }, 200)

    // Generate videos for all posts
    for (let i = 0; i < updatedPosts.length; i++) {
      const newVideoUrl = generateVideoUrl(updatedPosts[i].id)
      updatedPosts[i] = {
        ...updatedPosts[i],
        videoUrl: newVideoUrl,
        videoGenerated: true,
      }

      // If the post has a numeric ID, add it to the list to update in the database
      if (typeof updatedPosts[i].id === "number") {
        postsToUpdate.push({
          id: updatedPosts[i].id as number,
          video: newVideoUrl,
        })
      }
    }

    // Update posts with videos after a short delay to simulate background processing
    setTimeout(async () => {
      // Clear the progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }

      // Update the database if we have numeric IDs
      if (postsToUpdate.length > 0) {
        try {
          const result = await updatePostVideos(postsToUpdate)
          if (!result.success) {
            toast({
              title: "Warning",
              description: "Videos generated but not all saved to database",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Error updating post videos:", error)
          toast({
            title: "Warning",
            description: "Videos generated but not saved to database",
            variant: "destructive",
          })
        }
      }

      setLocalPosts(updatedPosts)
      setGenerationProgress(100)
      setAllVideosGenerated(true)
      setIsGeneratingAll(false)

      toast({
        title: "Videos generated",
        description: "All videos have been generated successfully.",
      })
    }, 3000)
  }

  // Function to regenerate a single video
  const regenerateVideo = async (postId: string | number) => {
    setGeneratingPostId(postId)

    try {
      // Generate a new video URL
      const newVideoUrl = generateVideoUrl(postId)

      // Update the database if we have a numeric ID
      if (typeof postId === "number") {
        const result = await updatePostVideos([{ id: postId, video: newVideoUrl }])
        if (!result.success) {
          toast({
            title: "Warning",
            description: "Video regenerated but not saved to database",
            variant: "destructive",
          })
        }
      }

      // Update the specific post with a new video
      setLocalPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                videoUrl: newVideoUrl,
                videoGenerated: true,
              }
            : post,
        ),
      )

      toast({
        title: "Video regenerated",
        description: "The video has been regenerated successfully.",
      })
    } catch (error) {
      console.error("Error regenerating video:", error)
      toast({
        title: "Error",
        description: "Failed to regenerate video",
        variant: "destructive",
      })
    } finally {
      setGeneratingPostId(null)
    }
  }

  // Function to handle completion
  const handleComplete = async () => {
    setIsFinalizing(true)

    try {
      // Call onComplete with the updated posts
      onComplete(localPosts)
    } catch (error) {
      console.error("Error completing video generation:", error)
      toast({
        title: "Error",
        description: "Failed to complete video generation",
        variant: "destructive",
      })
    } finally {
      setIsFinalizing(false)
    }
  }

  // Function to preview video
  const previewVideo = (videoUrl: string) => {
    setVideoModalUrl(videoUrl)
  }

  // Helper function to get selected images from a post
  const getSelectedImages = (post: Post) => {
    if (!post.images) {
      // If no images JSON, check for single image
      if (post.image || post.imageUrl) {
        return [{ url: post.image || post.imageUrl, isSelected: true }]
      }
      return []
    }

    try {
      const imagesData = JSON.parse(post.images)
      return (imagesData.images || []).filter((img: any) => img.isSelected === true)
    } catch (e) {
      console.error("Error parsing images JSON:", e)
      // Fallback to single image if JSON parsing fails
      if (post.image || post.imageUrl) {
        return [{ url: post.image || post.imageUrl, isSelected: true }]
      }
      return []
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Generate Videos</h2>
        <p className="text-gray-700">Create videos for your posts based on their content and images</p>
      </div>

      {isGeneratingAll && (
        <div className="bg-gray-100 border-4 border-black rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">Generating videos...</span>
            <span className="font-bold">{generationProgress}%</span>
          </div>
          <div className="w-full bg-gray-300 h-4 rounded-md border-2 border-black overflow-hidden">
            <div
              className="bg-yellow-300 h-full transition-all duration-300 ease-out"
              style={{ width: `${generationProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Always show the Generate All Videos button when not generating */}
      {!isGeneratingAll && (
        <div className="flex justify-center mb-4">
          <button
            onClick={generateAllVideos}
            disabled={isGeneratingAll}
            className="py-3 px-6 bg-yellow-300 border-4 border-black rounded-md font-bold text-lg hover:bg-yellow-400 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
          >
            <Play size={20} />
            {allVideosGenerated ? "Regenerate All Videos" : "Generate All Videos"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {localPosts.map((post, index) => {
          const isGenerating = generatingPostId === post.id
          const hasVideo = post.videoUrl && post.videoUrl !== "/placeholder.mp4"
          const selectedImages = getSelectedImages(post)

          return (
            <div key={post.id} className="border-4 border-black rounded-md p-4 bg-white">
              <div className="flex flex-col gap-4">
                {/* Add post title/ID in the header */}
                <div className="p-4 bg-yellow-100 border-b-4 border-black flex justify-between items-center">
                  <h3 className="font-bold text-lg">Post {index + 1}</h3>
                  <div className="flex items-center gap-2">
                    {hasVideo && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={16} />
                        Generated
                      </span>
                    )}
                  </div>
                </div>

                {/* Post content */}
                <p className="text-lg mb-2">{post.content}</p>

                {/* Images row - ONLY SELECTED IMAGES */}
                <div className="mb-4">
                  <div className="grid grid-cols-4 gap-2">
                    {post.images ? (
                      // If post has multiple images (from JSON), display only selected ones
                      (() => {
                        try {
                          const imagesData = JSON.parse(post.images)
                          const images = (imagesData.images || []).filter((image: any) => image.isSelected === true)

                          // If no selected images or all are placeholders, don't show anything
                          const realImages = images.filter((img: any) => !img.url.includes("placeholder.svg"))

                          if (realImages.length === 0) {
                            return (
                              <div className="col-span-4 py-3 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-md">
                                No images selected for this post
                              </div>
                            )
                          }

                          // Show only real images
                          return realImages.map((image: any, idx: number) => (
                            <div
                              key={idx}
                              className="relative h-24 border-2 border-gray-200 rounded-md overflow-hidden"
                            >
                              <Image
                                src={image.url || "/placeholder.svg"}
                                alt={`Image ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                Style: {image.metadata?.style || "default"}
                              </div>
                            </div>
                          ))
                        } catch (e) {
                          // Check if single image is a placeholder
                          if (post.image?.includes("placeholder.svg") || post.imageUrl?.includes("placeholder.svg")) {
                            return (
                              <div className="col-span-4 py-3 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-md">
                                No images selected for this post
                              </div>
                            )
                          }

                          // Fallback to single image if JSON parsing fails and it's not a placeholder
                          if (post.image || post.imageUrl) {
                            return (
                              <div className="relative h-24 border-2 border-gray-200 rounded-md overflow-hidden">
                                <Image
                                  src={post.image || post.imageUrl || ""}
                                  alt="Post image"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )
                          }

                          return (
                            <div className="col-span-4 py-3 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-md">
                              No images available for this post
                            </div>
                          )
                        }
                      })()
                    ) : (
                      // No images data at all
                      <div className="col-span-4 py-3 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-md">
                        No images available for this post
                      </div>
                    )}
                  </div>
                </div>

                {/* Video status */}
                <div className="bg-gray-100 border-2 border-black rounded-md p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play size={16} className="text-black" />
                      <span className="font-medium">Video Status:</span>
                    </div>
                    {hasVideo ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={16} />
                        Generated
                      </span>
                    ) : isGenerating ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={16} className="animate-spin" />
                        Generating...
                      </span>
                    ) : (
                      <span className="text-gray-500">Not generated</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {hasVideo && (
                    <button
                      onClick={() => previewVideo(post.videoUrl!)}
                      className="py-1 px-3 bg-blue-300 border-2 border-black rounded-md hover:bg-blue-400 flex items-center gap-1 text-sm"
                    >
                      <Eye size={14} />
                      Preview Video
                    </button>
                  )}
                  <button
                    onClick={() => regenerateVideo(post.id)}
                    disabled={isGenerating || isGeneratingAll}
                    className="py-1 px-3 bg-purple-300 border-2 border-black rounded-md hover:bg-purple-400 flex items-center gap-1 text-sm disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        {hasVideo ? "Regenerate Video" : "Generate Video"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={isGeneratingAll || generatingPostId !== null || isFinalizing}
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
        >
          Back
        </button>
        <button
          onClick={handleComplete}
          disabled={isGeneratingAll || generatingPostId !== null || isFinalizing}
          className="flex-1 py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70 disabled:transform-none disabled:hover:bg-green-400 flex items-center justify-center gap-2"
        >
          {isFinalizing ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2" size={20} />
              Finalizing...
            </span>
          ) : (
            "Continue to Review"
          )}
        </button>
      </div>

      {/* Video Modal */}
      {videoModalUrl && (
        <VideoModal videoUrl={videoModalUrl} isOpen={!!videoModalUrl} onClose={() => setVideoModalUrl(null)} />
      )}
    </div>
  )
}
