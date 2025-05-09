"use client"

import { useState, useEffect } from "react"
import type { Campaign, Theme, Post } from "../campaign-workflow"
import { CheckIcon, RefreshCw, Eye, Loader2 } from "lucide-react"
import PostModal from "../ui/post-modal"
import { approvePosts, fetchPostsForTheme } from "@/lib/actions"
import { checkThemePostStatus } from "@/lib/actions_api" // Updated import
import { useToast } from "@/hooks/use-toast"
import type { PostMetadata } from "@/lib/schema"

interface GenerateApproveContentProps {
  campaign: Campaign
  theme: Theme
  onApprove: (posts: Post[]) => void
  onBack: () => void
}

export default function GenerateApproveContent({ campaign, theme, onApprove, onBack }: GenerateApproveContentProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string | number>>(new Set())
  const [regeneratingPostId, setRegeneratingPostId] = useState<string | number | null>(null)
  const [modalPost, setModalPost] = useState<Post | null>(null)
  const { toast } = useToast()

  // Add polling logic to check for content generation
  const [isPolling, setIsPolling] = useState(false)
  const [pollingThemeId, setPollingThemeId] = useState<number | null>(null)
  const [pollingAttempts, setPollingAttempts] = useState(0)
  const MAX_POLLING_ATTEMPTS = 30 // About 1 minute with 2-second intervals

  // Start polling when the component mounts
  useEffect(() => {
    if (campaign && theme && typeof theme.id === "number") {
      startPollingForContent(theme.id)
    }
  }, [campaign, theme])

  // Function to poll for content
  const startPollingForContent = async (themeId: number) => {
    if (!themeId) return

    setIsPolling(true)
    setPollingThemeId(themeId)
    setPollingAttempts(0)
    setPosts([]) // Clear any existing posts while polling

    try {
      // Poll for content
      const checkContent = async () => {
        try {
          // Use the direct server action to check theme status
          const result = await checkThemePostStatus(themeId)

          if (result.success) {
            // If posts are ready, update the posts state
            if (result.data.isReady) {
              // If we have posts from the status check, use them
              if (result.data.posts && result.data.posts.length > 0) {
                setPosts(result.data.posts)
                setIsPolling(false)
                setPollingThemeId(null)

                toast({
                  title: "Content ready",
                  description: `Content for this theme is now ready.`,
                })
                return
              } else {
                // If post_status is ready but no posts returned, fetch them explicitly
                fetchExistingPosts()
                return
              }
            } else {
              // Increment polling attempts
              setPollingAttempts((prev) => prev + 1)

              // Continue polling if not ready
              setTimeout(checkContent, 2000)
            }
          } else {
            // Try fetching posts directly as a fallback
            fetchExistingPosts()
          }
        } catch (error) {
          // If an error occurs during polling, try fetching posts directly
          fetchExistingPosts()
        }
      }

      // Start the polling
      checkContent()
    } catch (error) {
      // Try fetching posts directly as a fallback
      fetchExistingPosts()
    }
  }

  // Function to fetch existing posts
  const fetchExistingPosts = async () => {
    if (!campaign.id || typeof theme.id !== "number") {
      toast({
        title: "Error",
        description: "Campaign or theme ID is missing",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Call a new server action to fetch posts for this theme
      const result = await fetchPostsForTheme(campaign.id, theme.id)

      if (result.success && result.data.length > 0) {
        console.log("Fetched posts from database:", result.data.length)
        setPosts(result.data)
        setIsPolling(false)
        setPollingThemeId(null)

        toast({
          title: "Posts loaded",
          description: `${result.data.length} posts loaded for this theme.`,
        })
      } else {
        // If no posts found, show a message but keep polling
        toast({
          title: "Generating content",
          description: "Content is being generated. Please wait...",
        })

        // If we're not already polling, start polling
        if (!isPolling) {
          startPollingForContent(theme.id)
        }
      }
    } catch (error) {
      console.error("Error fetching posts:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching posts",
        variant: "destructive",
      })
      setIsPolling(false)
    } finally {
      setIsGenerating(false)
    }
  }

  // Select all posts by default when posts are generated
  useEffect(() => {
    if (posts.length > 0) {
      const allPostIds = new Set(posts.map((post) => post.id))
      setSelectedPostIds(allPostIds)
    }
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
    const allPostIds = new Set(posts.map((post) => post.id))
    setSelectedPostIds(allPostIds)
  }

  const handleDeselectAll = () => {
    setSelectedPostIds(new Set())
  }

  const handleApprove = async () => {
    if (posts.length === 0) return

    setIsApproving(true)

    try {
      // Separate posts into approved and disapproved
      const approvedPostIds = Array.from(selectedPostIds).filter((id) => typeof id === "number") as number[]
      const allPostIds = posts.filter((post) => typeof post.id === "number").map((post) => post.id as number)
      const disapprovedPostIds = allPostIds.filter((id) => !selectedPostIds.has(id))

      console.log("Approving posts with IDs:", approvedPostIds)
      console.log("Disapproving posts with IDs:", disapprovedPostIds)

      if (approvedPostIds.length > 0 || disapprovedPostIds.length > 0) {
        const result = await approvePosts(approvedPostIds, disapprovedPostIds)

        if (result.success) {
          toast({
            title: "Posts processed",
            description: `${selectedPostIds.size} posts approved and ${disapprovedPostIds.length} posts disapproved.`,
          })
          const selectedPosts = posts.filter((post) => selectedPostIds.has(post.id))
          onApprove(selectedPosts)
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to process posts",
            variant: "destructive",
          })
          setIsApproving(false)
        }
      } else {
        // If we don't have numeric IDs (which would be the case with mock data),
        // just pass the selected posts to the parent component
        const selectedPosts = posts.filter((post) => selectedPostIds.has(post.id))
        onApprove(selectedPosts)
      }
    } catch (error) {
      console.error("Error processing posts:", error)
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
      // Update the post in the database if it has a numeric ID
      if (typeof postId === "number") {
        // Call the API to regenerate the post content
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/posts/${postId}/regenerate-content`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to regenerate post: ${response.status} ${response.statusText}`)
        }

        const result = await response.json()

        if (result.success && result.data) {
          // Update the post in the local state
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    content: result.data.content,
                  }
                : post,
            ),
          )

          toast({
            title: "Post regenerated",
            description: "The post content has been regenerated successfully.",
          })
        } else {
          throw new Error(result.error || "Failed to regenerate post content")
        }
      }
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

  // Get theme name and description from either old or new schema fields
  const themeName = theme.title || theme.name || "Theme"
  const themeDescription = theme.story || theme.description || ""

  // Parse post_metadata
  const parsePostMetadata = (post: Post): PostMetadata | null => {
    if (!post.post_metadata) return null

    try {
      if (typeof post.post_metadata === "string") {
        return JSON.parse(post.post_metadata)
      }
      return post.post_metadata as PostMetadata
    } catch (e) {
      console.error("Error parsing post metadata:", e)
      return null
    }
  }

  // Get content type from post_metadata
  const getContentType = (post: Post): string => {
    const metadata = parsePostMetadata(post)
    if (metadata && metadata.content_type) {
      return metadata.content_type
    }
    return "Story" // Fallback to default
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Campaign Content</h2>
        <p className="text-gray-700">Generate and approve content for your campaign</p>
      </div>

      {/* Theme info box */}
      <div className="bg-purple-50 border-4 border-black rounded-md p-4 mb-6">
        <h3 className="font-bold text-lg">Selected Theme</h3>
        <h4 className="text-xl font-bold">{themeName}</h4>
        <p>{themeDescription}</p>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 border-4 border-black rounded-md">
          {isPolling || isGenerating ? (
            <>
              <Loader2 size={40} className="animate-spin text-black mb-4" />
              <p className="text-lg font-medium">Generating content...</p>
              <p className="text-gray-600 mt-2">Please wait while we prepare your content.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium mb-4">No content has been generated yet</p>
              <button
                onClick={fetchExistingPosts}
                className="py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                Generate Content
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <h3 className="text-xl font-bold">Campaign Posts</h3>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <div className="text-sm">
              <span className="font-bold">{selectedPostIds.size}</span> of{" "}
              <span className="font-bold">{posts.length}</span> posts selected
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
            {posts.map((post, index) => {
              const isSelected = selectedPostIds.has(post.id)
              const isRegenerating = regeneratingPostId === post.id
              const day = index + 1
              const contentType = getContentType(post)

              return (
                <div
                  key={post.id}
                  className={`border-4 ${isSelected ? "border-green-500" : "border-black"} rounded-md p-4 hover:bg-gray-50 transition-all ${isRegenerating ? "opacity-70" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg">
                      Day {day} - {post.title || "Untitled Post"}
                    </h4>
                    <div className="bg-blue-200 px-3 py-1 border-2 border-black rounded-md text-sm font-medium">
                      {contentType}
                    </div>
                  </div>

                  <p className="text-lg mb-4">{post.content}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.content
                      .split(" ")
                      .filter((word) => word.startsWith("#"))
                      .map((hashtag, index) => (
                        <span key={index} className="py-1 px-3 bg-blue-100 border-2 border-blue-300 rounded-md text-sm">
                          {hashtag}
                        </span>
                      ))}
                  </div>

                  <div className="flex justify-between items-center">
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
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="bg-yellow-100 border-2 border-black rounded-md p-3 mb-4">
        <p className="text-sm font-medium">
          <span className="font-bold">Note:</span> Selected posts will be approved and unselected posts will be marked
          as disapproved.
        </p>
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
          disabled={isApproving || isGenerating || posts.length === 0}
          className="flex-1 py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70 disabled:transform-none disabled:hover:bg-green-400"
        >
          {isApproving ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2" size={20} />
              Processing...
            </span>
          ) : (
            `Approve Selected (${selectedPostIds.size}) / Disapprove Others (${posts.length - selectedPostIds.size})`
          )}
        </button>
      </div>

      {/* Post Detail Modal */}
      {modalPost && <PostModal post={modalPost} isOpen={!!modalPost} onClose={handleCloseModal} />}
    </div>
  )
}
