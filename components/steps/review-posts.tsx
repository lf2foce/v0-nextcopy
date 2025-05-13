"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import type { Post } from "../campaign-workflow"
import { CheckCircle, RefreshCw, Edit, Save, Loader2, X, Eye, Play, Check } from "lucide-react"
import { updatePostContent, updatePostImages, updatePostVideos, completeReview } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
// First, import the new ImageViewerModal component
import ImageViewerModal from "../ui/image-viewer-modal"
// Update the toggleImageSelection function to use saveImageSelection from actions_api.ts
// Add this import at the top of the file if it's not already there
import { saveImageSelection } from "@/lib/actions_api"

interface ReviewPostsProps {
  posts: Post[]
  onComplete: (posts: Post[]) => void
  onBack: () => void
}

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

      // Ensure the modal is in the viewport
      if (modalRef.current) {
        modalRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "auto"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{
        alignItems: "center",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div
        ref={modalRef}
        className="bg-white border-4 border-black rounded-lg max-w-3xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto"
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

// Helper function to get selected images from a post
const getSelectedImages = (post: Post) => {
  if (!post.images) return []

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

// Helper function to get all images from a post
const getAllImages = (post: Post) => {
  if (!post.images) return []

  try {
    const imagesData = JSON.parse(post.images)
    return imagesData.images || []
  } catch (e) {
    console.error("Error parsing images JSON:", e)

    // Fallback to single image if JSON parsing fails
    if (post.image || post.imageUrl) {
      return [{ url: post.image || post.imageUrl, isSelected: true }]
    }

    return []
  }
}

export default function ReviewPosts({ posts, onComplete, onBack }: ReviewPostsProps) {
  // Ensure we have valid posts with at least content
  const validPosts = posts.filter((post) => post && post.content)

  // If no valid posts, show a message
  const [localPosts, setLocalPosts] = useState<Post[]>(validPosts)
  const [editingPostId, setEditingPostId] = useState<string | number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [regeneratingPostId, setRegeneratingPostId] = useState<string | number | null>(null)
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | number | null>(null)
  const [regeneratingVideoId, setRegeneratingVideoId] = useState<string | number | null>(null)
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null)
  const { toast } = useToast()
  // First, add a new state for the finalize loading state
  const [isFinalizing, setIsFinalizing] = useState(false)
  // Add a new state for the image viewer modal
  const [viewerImages, setViewerImages] = useState<any[]>([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0)

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

  // Function to handle editing a post
  const startEditing = (post: Post) => {
    setEditingPostId(post.id)
    setEditContent(post.content)
  }

  // Function to cancel editing
  const cancelEditing = () => {
    setEditingPostId(null)
    setEditContent("")
  }

  // Function to save edited content
  const saveEditedContent = async (postId: string | number) => {
    if (!editContent.trim()) {
      toast({
        title: "Error",
        description: "Post content cannot be empty",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Update in database if we have a numeric ID
      if (typeof postId === "number") {
        const result = await updatePostContent(postId, editContent)

        if (!result.success) {
          toast({
            title: "Warning",
            description: "Post updated locally but not saved to database",
            variant: "destructive",
          })
        }
      }

      // Update local state
      setLocalPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                content: editContent,
              }
            : post,
        ),
      )

      toast({
        title: "Post updated",
        description: "The post content has been updated successfully.",
      })

      // Reset editing state
      setEditingPostId(null)
      setEditContent("")
    } catch (error) {
      console.error("Error updating post:", error)
      toast({
        title: "Error",
        description: "Failed to update post",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper function to generate random post content
  const generateRandomPostContent = () => {
    const intros = [
      "Check out our latest collection!",
      "Introducing our newest products!",
      "You won't believe what we just launched!",
      "The wait is over - it's finally here!",
      "Elevate your experience with our new release!",
    ]

    const descriptions = [
      "Perfect for those who appreciate quality and style.",
      "Designed with you in mind, for every occasion.",
      "Crafted with premium materials for lasting performance.",
      "The ultimate combination of form and function.",
      "Setting new standards in design and innovation.",
    ]

    const hashtags = ["#NewRelease", "#MustHave", "#LimitedEdition", "#TrendAlert", "#ExclusiveOffer"]

    const randomIntro = intros[Math.floor(Math.random() * intros.length)]
    const randomDesc = descriptions[Math.floor(Math.random() * descriptions.length)]
    const randomHashtag1 = hashtags[Math.floor(Math.random() * hashtags.length)]
    const randomHashtag2 = hashtags[Math.floor(Math.random() * hashtags.length)]

    return `${randomIntro} ${randomDesc} ${randomHashtag1} ${randomHashtag2}`
  }

  // Function to regenerate post content
  const handleRegeneratePost = async (postId: string | number) => {
    setRegeneratingPostId(postId)

    try {
      // Generate new content
      const newContent = generateRandomPostContent()

      // Update the post in the database if it has a numeric ID
      if (typeof postId === "number") {
        const result = await updatePostContent(postId, newContent)

        if (!result.success) {
          toast({
            title: "Warning",
            description: "Post regenerated but not saved to database",
            variant: "destructive",
          })
        }
      }

      // Update the local posts array with the regenerated post
      setLocalPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                content: newContent,
              }
            : post,
        ),
      )

      toast({
        title: "Post regenerated",
        description: "The post content has been regenerated successfully.",
      })
    } catch (error) {
      console.error("Error regenerating post:", error)
      toast({
        title: "Error",
        description: "Failed to regenerate post",
        variant: "destructive",
      })
    } finally {
      setRegeneratingPostId(null)
    }
  }

  // Function to regenerate image
  const handleRegenerateImage = async (postId: string | number) => {
    setRegeneratingImageId(postId)

    try {
      // Generate a mock image URL from Unsplash
      const unsplashCollections = [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1527090526205-beaac8dc3c62?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1517495306984-f84210f9daa8?q=80&w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1445307806294-bff7f67ff225?q=80&w=600&auto=format&fit=crop",
      ]

      const randomIndex = Math.floor(Math.random() * unsplashCollections.length)
      const newImage = unsplashCollections[randomIndex]

      // Update the post in the database if it has a numeric ID
      if (typeof postId === "number") {
        const result = await updatePostImages([{ id: postId, image: newImage }])

        if (!result.success) {
          toast({
            title: "Warning",
            description: "Image regenerated but not saved to database",
            variant: "destructive",
          })
        }
      }

      // Update the local posts array with the regenerated image
      setLocalPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                image: newImage,
                imageUrl: newImage,
              }
            : post,
        ),
      )

      toast({
        title: "Image regenerated",
        description: "The post image has been regenerated successfully.",
      })
    } catch (error) {
      console.error("Error regenerating image:", error)
      toast({
        title: "Error",
        description: "Failed to regenerate image",
        variant: "destructive",
      })
    } finally {
      setRegeneratingImageId(null)
    }
  }

  // Function to regenerate video
  const handleRegenerateVideo = async (postId: string | number) => {
    setRegeneratingVideoId(postId)

    try {
      // Get a random video from the sample videos
      const randomIndex = Math.floor(Math.random() * sampleVideoUrls.length)
      const newVideo = sampleVideoUrls[randomIndex]

      // Update the post in the database if it has a numeric ID
      if (typeof postId === "number") {
        const result = await updatePostVideos([{ id: postId, video: newVideo }])

        if (!result.success) {
          toast({
            title: "Warning",
            description: "Video regenerated but not saved to database",
            variant: "destructive",
          })
        }
      }

      // Update the local posts array with the regenerated video
      setLocalPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                videoUrl: newVideo,
              }
            : post,
        ),
      )

      toast({
        title: "Video regenerated",
        description: "The post video has been regenerated successfully.",
      })
    } catch (error) {
      console.error("Error regenerating video:", error)
      toast({
        title: "Error",
        description: "Failed to regenerate video",
        variant: "destructive",
      })
    } finally {
      setRegeneratingVideoId(null)
    }
  }

  // Function to preview video
  const previewVideo = (videoUrl: string) => {
    setVideoModalUrl(videoUrl)
  }

  // Then update the handleComplete function to include loading state
  const handleComplete = async () => {
    setIsFinalizing(true)

    // Find the campaign ID from the first post
    const campaignId =
      localPosts.length > 0 && typeof localPosts[0].campaignId === "number" ? localPosts[0].campaignId : null

    if (campaignId) {
      try {
        // Update to step 6 (Review) when review is complete
        await completeReview(campaignId)
      } catch (error) {
        console.error("Error completing review:", error)
        toast({
          title: "Warning",
          description: "Review completed but step not updated in database",
          variant: "destructive",
        })
      }
    }

    // Short delay to show loading state
    setTimeout(() => {
      onComplete(localPosts)
      setIsFinalizing(false)
    }, 800)
  }

  // Add a function to open the image viewer modal
  const openImageViewer = (images: any[], initialIndex: number) => {
    setViewerImages(images)
    setViewerInitialIndex(initialIndex)
    setViewerOpen(true)
  }

  // Add a function to close the image viewer modal
  const closeImageViewer = () => {
    setViewerOpen(false)
  }

  // Replace the toggleImageSelection function with this implementation
  const toggleImageSelection = async (postId: number, imageIndex: number) => {
    try {
      // Find the post in the local state
      const postIndex = localPosts.findIndex((p) => p.id === postId)
      if (postIndex === -1) return

      // Create a copy of the post to modify
      const post = { ...localPosts[postIndex] }

      // Parse the current images JSON
      let imagesData
      try {
        imagesData = post.images ? JSON.parse(post.images) : { images: [] }
      } catch (e) {
        console.error("Error parsing images JSON:", e)
        imagesData = { images: [] }
      }

      // Make sure images array exists
      if (!imagesData.images) {
        imagesData.images = []
      }

      // Toggle the selection state of the clicked image
      if (imagesData.images[imageIndex]) {
        imagesData.images[imageIndex].isSelected = !imagesData.images[imageIndex].isSelected
      }

      // Find the first selected image to use as the main image
      let mainImageUrl = ""
      const selectedImage = imagesData.images.find((img: any) => img.isSelected)
      if (selectedImage) {
        mainImageUrl = selectedImage.url
      }

      // Update the images JSON string
      const updatedImagesJson = JSON.stringify(imagesData)

      // Update the post in local state
      const updatedPost = {
        ...post,
        images: updatedImagesJson,
        imageUrl: mainImageUrl,
        image: mainImageUrl,
      }

      // Update the local state
      const updatedPosts = [...localPosts]
      updatedPosts[postIndex] = updatedPost
      setLocalPosts(updatedPosts)

      // Save to database using saveImageSelection
      await saveImageSelection(postId, updatedImagesJson, mainImageUrl)

      // Show success toast
      toast({
        title: "Image selection updated",
        description: "Your image selection has been saved.",
      })
    } catch (error) {
      console.error("Error toggling image selection:", error)
      toast({
        title: "Error",
        description: "Failed to update image selection.",
        variant: "destructive",
      })
    }
  }

  // Helper function to check if a video is valid and available
  const isVideoAvailable = (videoUrl: string | null | undefined): boolean => {
    if (!videoUrl) return false
    if (videoUrl === "/placeholder.mp4") return false
    return true
  }

  if (validPosts.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black mb-2">Review Posts</h2>
          <p className="text-gray-700">No valid posts found to review. Please go back and generate content first.</p>
        </div>
        <button
          onClick={onBack}
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Review Posts</h2>
        <p className="text-gray-700">Review and edit your posts before finalizing your campaign</p>
      </div>

      <div className="space-y-6">
        {localPosts.map((post, index) => {
          const isEditing = editingPostId === post.id
          const isRegeneratingPost = regeneratingPostId === post.id
          const isRegeneratingImage = regeneratingImageId === post.id
          const isRegeneratingVideo = regeneratingVideoId === post.id
          const hasVideo = isVideoAvailable(post.videoUrl)

          // Get all images for this post (not just selected ones)
          const allImages = getAllImages(post)

          return (
            <div key={post.id} className="border-4 border-black rounded-md overflow-hidden bg-white">
              <div className="p-4 bg-yellow-100 border-b-4 border-black flex justify-between items-center">
                <h3 className="font-bold text-lg">{post.title || `Post ${index + 1}`}</h3>
                <div className="flex gap-2">
                  {!isEditing && (
                    <button
                      onClick={() => startEditing(post)}
                      className="py-1 px-3 bg-blue-300 border-2 border-black rounded-md hover:bg-blue-400 flex items-center gap-1 text-sm"
                      disabled={isRegeneratingPost || isRegeneratingImage || isRegeneratingVideo}
                    >
                      <Edit size={14} />
                      Edit Content
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                {/* Post content section */}
                <div className="p-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 border-4 border-black rounded-md focus:outline-hidden focus:ring-2 focus:ring-yellow-400 min-h-[150px]"
                        placeholder="Enter post content"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEditedContent(post.id)}
                          disabled={isSubmitting}
                          className="py-2 px-4 bg-green-400 border-2 border-black rounded-md hover:bg-green-500 flex items-center gap-1"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={16} />
                              Save
                            </>
                          )}
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={isSubmitting}
                          className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300 flex items-center gap-1"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg mb-4">{post.content}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.content
                          .split(" ")
                          .filter((word) => word.startsWith("#"))
                          .map((hashtag, index) => (
                            <span
                              key={index}
                              className="py-1 px-3 bg-blue-100 border-2 border-blue-300 rounded-md text-sm"
                            >
                              {hashtag}
                            </span>
                          ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Images row - Show all images with selection state */}
                {!isEditing && (
                  <div className="px-4 mb-4">
                    {allImages.length === 0 ? (
                      <div className="bg-gray-100 border-2 border-black rounded-md p-3">
                        <p className="text-gray-600">No images available for this post</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {allImages.map((image, imageIndex) => (
                            <div
                              key={imageIndex}
                              className={`relative border-4 ${
                                image.isSelected ? "border-green-500" : "border-black"
                              } rounded-md overflow-hidden h-40 cursor-pointer`}
                              onClick={(e) => {
                                // If holding Ctrl/Cmd key, toggle selection, otherwise open viewer
                                if (e.ctrlKey || e.metaKey) {
                                  toggleImageSelection(post.id, imageIndex)
                                } else {
                                  // Open image viewer with all images, starting at this index
                                  openImageViewer(allImages, imageIndex)
                                }
                              }}
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
                              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
                                Style: {image.metadata?.style || "default"}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          Click to view larger image. Hold Ctrl/Cmd while clicking to select/deselect.
                        </p>
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleRegenerateImage(post.id)}
                            disabled={isRegeneratingImage || isRegeneratingPost || isEditing || isRegeneratingVideo}
                            className="py-1 px-3 bg-yellow-300 border-2 border-black rounded-md hover:bg-yellow-400 flex items-center gap-1 text-sm disabled:opacity-50"
                          >
                            <RefreshCw size={14} />
                            New Image
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Video status - show appropriate UI based on video availability */}
                {!isEditing && (
                  <div className="px-4 mb-4">
                    <div className="bg-gray-100 border-2 border-black rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Play size={16} className="text-black" />
                          <span className="font-medium">Video Status:</span>
                          {!hasVideo && <span className="text-gray-600 ml-2">Not generated</span>}
                        </div>
                        <div className="flex gap-2">
                          {hasVideo && (
                            <button
                              onClick={() => previewVideo(post.videoUrl!)}
                              className="py-1 px-3 bg-blue-300 border-2 border-black rounded-md hover:bg-blue-400 flex items-center gap-1 text-sm"
                            >
                              <Eye size={14} />
                              View Video
                            </button>
                          )}
                          <button
                            onClick={() => handleRegenerateVideo(post.id)}
                            disabled={isRegeneratingVideo || isRegeneratingPost || isEditing || isRegeneratingImage}
                            className="py-1 px-3 bg-purple-300 border-2 border-black rounded-md hover:bg-purple-400 flex items-center gap-1 text-sm disabled:opacity-50"
                          >
                            {isRegeneratingVideo ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Regenerating...
                              </>
                            ) : (
                              <>
                                <RefreshCw size={14} />
                                {hasVideo ? "New Video" : "Generate Video"}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="px-4 pb-4">
                  {!isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(post)}
                        className="py-1 px-3 bg-blue-300 border-2 border-black rounded-md hover:bg-blue-400 flex items-center gap-1 text-sm"
                        disabled={isRegeneratingPost || isRegeneratingImage || isEditing || isRegeneratingVideo}
                      >
                        <Edit size={14} />
                        Edit Content
                      </button>

                      <button
                        onClick={() => handleRegeneratePost(post.id)}
                        disabled={isRegeneratingPost || isRegeneratingImage || isEditing || isRegeneratingVideo}
                        className="py-1 px-3 bg-purple-300 border-2 border-black rounded-md hover:bg-purple-400 flex items-center gap-1 text-sm disabled:opacity-50"
                      >
                        {isRegeneratingPost ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={14} />
                            New Content
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={
            isSubmitting || !!regeneratingPostId || !!regeneratingImageId || !!editingPostId || !!regeneratingVideoId
          }
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
        >
          Back
        </button>
        {/* Finally, update the Finalize button to show loading state */}
        <button
          onClick={handleComplete}
          disabled={
            isSubmitting ||
            !!regeneratingPostId ||
            !!regeneratingImageId ||
            !!editingPostId ||
            isFinalizing ||
            !!regeneratingVideoId
          }
          className="flex-1 py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
        >
          {isFinalizing ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2" size={20} />
              Finalizing...
            </span>
          ) : (
            <>
              <CheckCircle size={20} className="inline-block mr-2" />
              Finalize Posts
            </>
          )}
        </button>
      </div>

      {/* Image Viewer Modal */}
      {viewerOpen && (
        <ImageViewerModal
          images={viewerImages}
          initialIndex={viewerInitialIndex}
          isOpen={viewerOpen}
          onClose={closeImageViewer}
        />
      )}

      {/* Video Modal */}
      {videoModalUrl && (
        <VideoModal videoUrl={videoModalUrl} isOpen={!!videoModalUrl} onClose={() => setVideoModalUrl(null)} />
      )}
    </div>
  )
}
