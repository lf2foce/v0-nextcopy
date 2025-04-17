"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import type { Post } from "../campaign-workflow"
import { CheckIcon, RefreshCw, Eye, Loader2 } from "lucide-react"
import PostModal from "../ui/post-modal"
import { approvePosts, updatePostContent } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface ApprovePostProps {
  posts: Post[]
  onApprove: (posts: Post[]) => void
  onBack: () => void
}

export default function ApprovePost({ posts, onApprove, onBack }: ApprovePostProps) {
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string | number>>(new Set())
  const [regeneratingPostId, setRegeneratingPostId] = useState<string | number | null>(null)
  const [modalPost, setModalPost] = useState<Post | null>(null)
  const [localPosts, setLocalPosts] = useState<Post[]>(posts)
  const [isApproving, setIsApproving] = useState(false)
  const { toast } = useToast()

  // Select all posts by default when component mounts
  useEffect(() => {
    const allPostIds = new Set(posts.map((post) => post.id))
    setSelectedPostIds(allPostIds)
    setLocalPosts(posts)
  }, [posts])

  const handleTogglePost = (postId: string | number) => {
    const newSelectedPostIds = new Set(selectedPostIds)

    if (newSelectedPostIds.has(postId)) {
      newSelectedPostIds.delete(postId)
    } else {
      newSelectedPostIds.add(postId)
    }

    setSelectedPostIds(newSelectedPostIds)
  }

  const handleSelectAll = () => {
    const allPostIds = new Set(localPosts.map((post) => post.id))
    setSelectedPostIds(allPostIds)
  }

  const handleDeselectAll = () => {
    setSelectedPostIds(new Set())
  }

  const handleApprove = async () => {
    if (selectedPostIds.size === 0) return

    setIsApproving(true)

    try {
      const selectedPostIdsArray = Array.from(selectedPostIds).filter((id) => typeof id === "number") as number[]

      if (selectedPostIdsArray.length === 0) {
        // If we don't have numeric IDs (which would be the case with mock data),
        // just pass the selected posts to the parent component
        const selectedPosts = localPosts.filter((post) => selectedPostIds.has(post.id))
        onApprove(selectedPosts)
        return
      }

      console.log("Approving posts with IDs:", selectedPostIdsArray)
      const result = await approvePosts(selectedPostIdsArray)

      if (result.success) {
        toast({
          title: "Posts approved",
          description: `${selectedPostIds.size} posts have been approved.`,
        })
        const selectedPosts = localPosts.filter((post) => selectedPostIds.has(post.id))
        onApprove(selectedPosts)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to approve posts",
          variant: "destructive",
        })
        setIsApproving(false)
      }
    } catch (error) {
      console.error("Error approving posts:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      setIsApproving(false)
    }
  }

  const handleViewPost = (post: Post) => {
    setModalPost(post)
  }

  const handleCloseModal = () => {
    setModalPost(null)
  }

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
                image: `/placeholder.svg?height=400&width=400&text=Regenerated_${postId}`,
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Approve Posts</h2>
        <p className="text-gray-700">Select the posts you want to approve for your campaign</p>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm">
          <span className="font-bold">{selectedPostIds.size}</span> of{" "}
          <span className="font-bold">{localPosts.length}</span> posts selected
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-sm py-1 px-3 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="text-sm py-1 px-3 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {localPosts.map((post) => {
          const isSelected = selectedPostIds.has(post.id)
          const isRegenerating = regeneratingPostId === post.id

          return (
            <div
              key={post.id}
              className={`border-4 ${isSelected ? "border-green-500" : "border-black"} rounded-md p-4 hover:bg-gray-50 transition-all ${isRegenerating ? "opacity-70" : ""}`}
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3 relative h-48 md:h-auto">
                  <div className="absolute top-2 left-2 z-10">
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isRegenerating) handleTogglePost(post.id)
                      }}
                      className={`w-6 h-6 rounded-md flex items-center justify-center cursor-pointer ${isSelected ? "bg-green-500" : "bg-white border-2 border-black"}`}
                    >
                      {isSelected && <CheckIcon size={16} className="text-white" />}
                    </div>
                  </div>
                  <Image
                    src={post.image || "/placeholder.svg"}
                    alt="Post preview"
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-lg mb-4">{post.content}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewPost(post)}
                      className="py-1 px-3 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300 flex items-center gap-1 text-sm"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isRegenerating) handleRegeneratePost(post.id)
                      }}
                      disabled={isRegenerating}
                      className="py-1 px-3 bg-yellow-300 border-2 border-black rounded-md hover:bg-yellow-400 flex items-center gap-1 text-sm disabled:opacity-50"
                    >
                      {isRegenerating ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          Regenerate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={isApproving}
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
        >
          Back
        </button>
        <button
          onClick={handleApprove}
          disabled={selectedPostIds.size === 0 || isApproving}
          className="flex-1 py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70 disabled:transform-none disabled:hover:bg-green-400"
        >
          {isApproving ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2" size={20} />
              Approving...
            </span>
          ) : (
            `Approve ${selectedPostIds.size} Selected ${selectedPostIds.size === 1 ? "Post" : "Posts"}`
          )}
        </button>
      </div>

      {/* Post Detail Modal */}
      {modalPost && <PostModal post={modalPost} isOpen={!!modalPost} onClose={handleCloseModal} />}
    </div>
  )
}
