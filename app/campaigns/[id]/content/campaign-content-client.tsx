"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Users,
  Filter,
  Download,
  AlertCircle,
  Eye,
  Facebook,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { postToSocialMedia } from "@/lib/actions_api"
import PostModal from "@/components/ui/post-modal"
import { useToast } from "@/hooks/use-toast"
import { MultipleImagesDisplay } from "@/components/multiple-images-display"
import ImageViewerModal from "@/components/ui/image-viewer-modal"

export default function CampaignContentClient({
  initialCampaign,
  campaignId,
}: {
  initialCampaign: any
  campaignId: number
}) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<any>(initialCampaign)
  const [activeFilter, setActiveFilter] = useState("posted") // Default to posted content
  const [modalPost, setModalPost] = useState<any>(null)
  const [postingId, setPostingId] = useState<number | null>(null)
  const { toast } = useToast()

  // Add new states for the image viewer modal
  const [viewerImages, setViewerImages] = useState<any[]>([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0)

  // Update the handlePostToFacebook function in the content page
  const handlePostToFacebook = async (postId: number, content: string) => {
    setPostingId(postId)

    try {
      console.log(`Posting to Facebook: Post ID ${postId}`)
      const result = await postToSocialMedia(postId, "facebook", content)

      if (result.success) {
        console.log("Successfully posted to Facebook:", result.data)
        toast({
          title: "Posted to Facebook",
          description: "Your post has been successfully shared to Facebook.",
          variant: "success",
        })

        // Update the post status locally
        setCampaign((prevCampaign: any) => {
          if (!prevCampaign) return prevCampaign

          const updatedPosts = prevCampaign.allPosts.map((post: any) => {
            if (post.id === postId) {
              return { ...post, status: "posted" }
            }
            return post
          })

          return {
            ...prevCampaign,
            allPosts: updatedPosts,
          }
        })
      } else {
        console.error("Error posting to Facebook:", result.error)
        toast({
          title: "Error",
          description: result.error || "Failed to post to Facebook",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Exception when posting to Facebook:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setPostingId(null)
    }
  }

  async function generateImagesForPost(postId: number) {
    const { generateImagesForPost } = await import("@/lib/actions")
    const result = await generateImagesForPost(postId)

    if (result.success) {
      // Refresh the page to show new images
      window.location.reload()
    } else {
      // Show error message
      toast({
        title: "Error",
        description: result.error || "Failed to generate images",
        variant: "destructive",
      })
    }
  }

  // Add a function to open the image viewer modal
  const openImageViewer = (post: any) => {
    // Parse images from the post
    try {
      if (post.images) {
        const imagesData = JSON.parse(post.images)
        if (imagesData.images && imagesData.images.length > 0) {
          // Filter to only show selected images if available
          const selectedImages = imagesData.images.filter((img: any) => img.isSelected === true)
          const imagesToShow = selectedImages.length > 0 ? selectedImages : imagesData.images

          setViewerImages(imagesToShow)
          setViewerInitialIndex(0)
          setViewerOpen(true)
          return
        }
      }

      // Fallback to single image if JSON parsing fails or no images
      if (post.imageUrl) {
        setViewerImages([{ url: post.imageUrl }])
        setViewerInitialIndex(0)
        setViewerOpen(true)
      }
    } catch (e) {
      console.error("Error parsing images JSON:", e)
      // Fallback to single image
      if (post.imageUrl) {
        setViewerImages([{ url: post.imageUrl }])
        setViewerInitialIndex(0)
        setViewerOpen(true)
      }
    }
  }

  // Add a function to close the image viewer modal
  const closeImageViewer = () => {
    setViewerOpen(false)
  }

  // Get all posts
  const allPosts = campaign.allPosts || []

  // Filter posts based on active filter
  const filteredPosts =
    activeFilter === "all"
      ? allPosts
      : allPosts.filter((post: any) => {
          if (activeFilter === "approved") {
            return post.status === "approved"
          } else if (activeFilter === "scheduled") {
            return post.status === "scheduled"
          } else if (activeFilter === "posted" || activeFilter === "published") {
            return post.status === "posted"
          } else if (activeFilter === "disapproved") {
            return post.status === "disapproved"
          }
          return false
        })

  // Count posts by status
  const postCounts = {
    all: allPosts.length,
    approved: allPosts.filter((post: any) => post.status === "approved").length,
    scheduled: allPosts.filter((post: any) => post.status === "scheduled").length,
    published: allPosts.filter((post: any) => post.status === "posted").length,
    disapproved: allPosts.filter((post: any) => post.status === "disapproved").length,
  }

  // Functions to handle post modal
  const handleViewPost = (post: any) => {
    setModalPost(post)
  }

  const handleCloseModal = () => {
    setModalPost(null)
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <Link
            href={`/campaigns/${campaignId}`}
            className="flex items-center gap-1 py-2 px-4 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300"
          >
            <ArrowLeft size={16} />
            Back to Campaign
          </Link>
          <h1 className="text-3xl font-black ml-2">Campaign Content</h1>
        </div>

        <button className="flex items-center gap-2 py-2 px-4 bg-[#22c55e] border-2 border-black rounded-md font-medium hover:bg-[#16a34a] text-white">
          <Download size={16} />
          Export Content
        </button>
      </div>

      <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
        <h2 className="text-2xl font-bold mb-4">{campaign.name || campaign.title}</h2>
        <p className="text-gray-700 mb-4">{campaign.description}</p>

        <div className="flex items-center gap-2">
          <Users size={16} className="flex-shrink-0" />
          <span className="font-medium">{campaign.targetCustomer || "Not specified"}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFilter("all")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "all" ? "bg-[#FFDD00]" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          All ({postCounts.all})
        </button>
        <button
          onClick={() => setActiveFilter("approved")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "approved" ? "bg-[#FFDD00]" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Approved ({postCounts.approved})
        </button>
        <button
          onClick={() => setActiveFilter("scheduled")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "scheduled" ? "bg-[#FFDD00]" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Scheduled ({postCounts.scheduled})
        </button>
        <button
          onClick={() => setActiveFilter("published")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "published" ? "bg-[#FFDD00]" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Published ({postCounts.published})
        </button>
        <button
          onClick={() => setActiveFilter("disapproved")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "disapproved" ? "bg-[#FFDD00]" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Disapproved ({postCounts.disapproved})
        </button>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-gray-100 border-4 border-black rounded-lg p-6 text-center">
          <Filter size={24} className="mx-auto mb-2 text-gray-500" />
          <h3 className="text-xl font-bold mb-2">No content found</h3>
          <p className="text-gray-700">
            {activeFilter === "all"
              ? "No content has been generated for this campaign yet."
              : `No ${activeFilter === "posted" ? "published" : activeFilter} content found for this campaign.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post: any, index: number) => {
            // Determine post status
            let statusLabel = post.status.charAt(0).toUpperCase() + post.status.slice(1)
            let statusColor = "bg-gray-200"

            if (post.status === "scheduled") {
              statusColor = "bg-[#22c55e]"
            } else if (post.status === "posted") {
              statusLabel = "Published"
              statusColor = "bg-[#60a5fa]"
            } else if (post.status === "approved") {
              statusColor = "bg-[#FFDD00]"
            } else if (post.status === "disapproved") {
              statusColor = "bg-[#f87171]"
            }

            return (
              <div
                key={post.id || index}
                className="bg-white border-4 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex justify-between items-start p-4 border-b-4 border-black">
                  <h3 className="text-xl font-bold">
                    {post.status === "posted" ? "Content Published" : `Post ${index + 1}`}
                  </h3>
                  <span
                    className={`py-1 px-3 border-2 border-black rounded-md text-sm font-medium ${statusColor} ${statusColor === "bg-[#22c55e]" || statusColor === "bg-[#60a5fa]" ? "text-white" : ""}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="p-6">
                  <p className="text-lg mb-4">{post.content}</p>

                  {/* Media Display - Images and Video */}
                  <div className="mb-6 cursor-pointer" onClick={() => openImageViewer(post)}>
                    <MultipleImagesDisplay
                      imagesJson={post.images}
                      defaultImageIndex={0}
                      layout="horizontal"
                      showMainImage={false}
                      videoUrl={post.videoUrl}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.content
                      .split(" ")
                      .filter((word: string) => word.startsWith("#"))
                      .map((hashtag: string, index: number) => (
                        <span key={index} className="py-1 px-3 bg-blue-100 border-2 border-blue-300 rounded-md text-sm">
                          {hashtag}
                        </span>
                      ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      onClick={() => handleViewPost(post)}
                      className="py-1 px-3 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300 flex items-center gap-1 text-sm"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                    <button
                      onClick={() => generateImagesForPost(post.id)}
                      className="py-1 px-3 bg-purple-300 border-2 border-black rounded-md hover:bg-purple-400 flex items-center gap-1 text-sm"
                    >
                      <RefreshCw size={14} />
                      Generate Images
                    </button>

                    {/* Post to Facebook button - only show if not already posted */}
                    {post.status !== "posted" && (
                      <button
                        onClick={() => handlePostToFacebook(post.id, post.content)}
                        disabled={postingId === post.id || post.status === "disapproved"}
                        className="py-1 px-3 bg-blue-600 border-2 border-black rounded-md hover:bg-blue-700 flex items-center gap-1 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {postingId === post.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <Facebook size={14} />
                            Post to Facebook
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {post.status === "disapproved" && (
                    <div className="flex items-center gap-2 p-3 bg-red-100 border-2 border-red-300 rounded-md mb-4">
                      <AlertCircle size={16} className="text-red-500" />
                      <span className="text-sm">This post was disapproved during content selection.</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {post.scheduledDate && (
                      <>
                        <Calendar size={14} className="flex-shrink-0" />
                        <span>
                          {post.scheduledDate instanceof Date
                            ? post.scheduledDate.toLocaleDateString()
                            : new Date(post.scheduledDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewerOpen && (
        <ImageViewerModal
          images={viewerImages}
          initialIndex={viewerInitialIndex}
          isOpen={viewerOpen}
          onClose={closeImageViewer}
        />
      )}

      {/* Post Detail Modal */}
      {modalPost && <PostModal post={modalPost} isOpen={!!modalPost} onClose={handleCloseModal} />}
    </div>
  )
}
