"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import type { Post } from "../campaign-workflow"
import { Loader2, RefreshCw, Play, CheckCircle, Eye, AlertTriangle } from "lucide-react"
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
  skipIfNoImages?: boolean
}

export default function GenerateVideo({ posts, onComplete, onBack, skipIfNoImages = false }: GenerateVideoProps) {
  const [localPosts, setLocalPosts] = useState<LocalPost[]>(posts.map(p => ({ ...p, generationStatus: 'idle' })))
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [generatingPostId, setGeneratingPostId] = useState<string | number | null>(null) // Used for individual regeneration spinner
  const [generationProgress, setGenerationProgress] = useState(0)
  const [allVideosGenerated, setAllVideosGenerated] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null)
  const { toast } = useToast()

  // Check if any posts have images
  const hasPostsWithImages = posts.some((post) => {
    if (post.images) {
      try {
        const imagesData = JSON.parse(post.images)
        const images = imagesData.images || []
        return images.some((img: any) => img.isSelected && !img.url?.includes("placeholder"))
      } catch (e) {
        return false
      }
    }
    return (
      (post.image && !post.image.includes("placeholder")) || (post.imageUrl && !post.imageUrl.includes("placeholder"))
    )
  })

  // Progress interval reference
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalsRef = useRef<Map<string | number, NodeJS.Timeout>>(new Map()) // Store polling intervals for each post

  // Initialize localPosts and check existing videos
  useEffect(() => {
    const postsWithInitialStatus = posts.map((post) => {
      const hasExistingVideo = post.videoUrl && post.videoUrl !== "/placeholder.mp4"
      return {
        ...post,
        videoUrl: post.videoUrl || "/placeholder.mp4",
        videoGenerated: hasExistingVideo,
        generationStatus: hasExistingVideo ? "succeeded" : "idle",
      } as LocalPost
    })

    setLocalPosts(postsWithInitialStatus)

    const hasAllVideos = postsWithInitialStatus.every((post) => post.videoGenerated)
    setAllVideosGenerated(hasAllVideos)
  }, [posts])

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
      pollingIntervalsRef.current.clear();
    }
  }, [])

  // Helper function to get selected images from a post
  const getSelectedImagesForApi = (post: LocalPost) => {
    if (!post.images) {
      if (post.image && !post.image.includes("placeholder")) return [post.image];
      if (post.imageUrl && !post.imageUrl.includes("placeholder")) return [post.imageUrl];
      return []
    }
    try {
      const imagesData = JSON.parse(post.images)
      return (imagesData.images || [])
        .filter((img: any) => img.isSelected === true && img.url && !img.url.includes("placeholder"))
        .map((img: any) => img.url)
    } catch (e) {
      if (post.image && !post.image.includes("placeholder")) return [post.image];
      if (post.imageUrl && !post.imageUrl.includes("placeholder")) return [post.imageUrl];
      return []
    }
  }

  // Polling function for video status
  const pollForVideoStatus = async (postId: string | number, taskId: string) => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/generate-video?taskId=${taskId}`);
        const result = await response.json();

        if (response.ok && result.success) {
          const { status, video_url, error: taskError } = result.data; // FastAPI returns result.data for status

          if (status === 'completed' || status === 'SUCCESS') { // Changed 'SUCCESS' to 'completed' || 'SUCCESS'
            clearInterval(intervalId);
            pollingIntervalsRef.current.delete(postId);
            setLocalPosts(prevPosts =>
              prevPosts.map(p =>
                p.id === postId
                  ? { ...p, videoUrl: video_url, videoGenerated: true, generationStatus: 'succeeded', generationTaskId: undefined, errorMessage: undefined }
                  : p
              )
            );
            // If this was the last generating post during 'Generate All', update database
            if (typeof postId === 'number') {
                await updatePostVideos([{ id: postId, video: video_url as string }]);
            }
            toast({ title: "Video Ready", description: `Video for post ${postId} is ready.` });

            // Check if all videos are now generated
            setLocalPosts(currentPosts => {
                const allDone = currentPosts.every(p => p.generationStatus === 'succeeded' || (p.videoUrl && p.videoUrl !== '/placeholder.mp4'));
                if (allDone) {
                    setAllVideosGenerated(true);
                    setIsGeneratingAll(false); // Ensure this is reset
                    setGenerationProgress(100);
                }
                return currentPosts;
            });

          } else if (status === 'FAILURE' || status === 'failed') { // Added 'failed' for robustness
            clearInterval(intervalId);
            pollingIntervalsRef.current.delete(postId);
            setLocalPosts(prevPosts =>
              prevPosts.map(p =>
                p.id === postId ? { ...p, generationStatus: 'failed', videoGenerated: false, errorMessage: taskError || 'Video generation failed.' } : p
              )
            );
            toast({ title: "Error", description: `Video generation failed for post ${postId}: ${taskError || 'Unknown error'}`, variant: "destructive" });
          } else if (status === 'PENDING' || status === 'PROCESSING' || status === 'pending' || status === 'processing') { // Added lowercase for robustness
            // Still generating, continue polling
            setLocalPosts(prevPosts =>
              prevPosts.map(p => (p.id === postId ? { ...p, generationStatus: 'generating' } : p))
            );
          }
        } else {
          // API call to polling endpoint failed
          clearInterval(intervalId);
          pollingIntervalsRef.current.delete(postId);
          setLocalPosts(prevPosts =>
            prevPosts.map(p => (p.id === postId ? { ...p, generationStatus: 'failed', errorMessage: result.error || 'Polling request failed' } : p))
          );
          toast({ title: "Polling Error", description: `Failed to get status for post ${postId}: ${result.error}`, variant: "destructive" });
        }
      } catch (error) {
        clearInterval(intervalId);
        pollingIntervalsRef.current.delete(postId);
        console.error("Polling error:", error);
        setLocalPosts(prevPosts =>
          prevPosts.map(p => (p.id === postId ? { ...p, generationStatus: 'failed', errorMessage: 'Polling exception' } : p))
        );
        toast({ title: "Polling Error", description: `An error occurred while polling for post ${postId}.`, variant: "destructive" });
      }
    }, 5000); // Poll every 5 seconds

    pollingIntervalsRef.current.set(postId, intervalId);
  };

  // Function to generate videos for all posts
  const generateAllVideos = async () => {
    setIsGeneratingAll(true);
    setGenerationProgress(0);
    setAllVideosGenerated(false);

    // Clear any previous polling intervals
    pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
    pollingIntervalsRef.current.clear();

    // Reset status for all posts
    setLocalPosts(prevPosts => prevPosts.map(p => ({ ...p, generationStatus: 'pending_request', videoGenerated: false, videoUrl: '/placeholder.mp4', errorMessage: undefined })))

    let postsSuccessfullyInitiated = 0;
    const totalPostsToProcess = localPosts.length;

    for (const post of localPosts) {
      // Skip posts that don't have images if skipIfNoImages is true and hasPostsWithImages is false (though UI should prevent this)
      const selectedImageUrls = getSelectedImagesForApi(post);
      if (skipIfNoImages && !hasPostsWithImages && selectedImageUrls.length === 0) {
        setLocalPosts(prev => prev.map(p => p.id === post.id ? {...p, generationStatus: 'idle', errorMessage: 'Skipped, no images'} : p));
        continue;
      }

      try {
        const payload = {
          postId: post.id,
          content: post.content,
          imageUrls: selectedImageUrls,
          // Pass other details if available, e.g., from campaign or theme context
          // theme: post.themeName, // Example: if post object had themeName
        };

        const response = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          if (result.taskId) {
            setLocalPosts(prev => prev.map(p => p.id === post.id ? {...p, generationStatus: 'generating', generationTaskId: result.taskId } : p));
            pollForVideoStatus(post.id, result.taskId);
          } else if (result.videoUrl) {
            setLocalPosts(prev => prev.map(p => p.id === post.id ? {...p, videoUrl: result.videoUrl, videoGenerated: true, generationStatus: 'succeeded' } : p));
            if (typeof post.id === 'number') {
                await updatePostVideos([{ id: post.id, video: result.videoUrl }]);
            }
          } else {
            setLocalPosts(prev => prev.map(p => p.id === post.id ? {...p, generationStatus: 'failed', errorMessage: result.error || 'No video URL or task ID received.' } : p));
          }
          postsSuccessfullyInitiated++;
        } else {
          setLocalPosts(prev => prev.map(p => p.id === post.id ? {...p, generationStatus: 'failed', errorMessage: result.error || `API request failed (${response.status})` } : p));
        }
      } catch (error) {
        console.error(`Error generating video for post ${post.id}:`, error);
        setLocalPosts(prev => prev.map(p => p.id === post.id ? {...p, generationStatus: 'failed', errorMessage: error instanceof Error ? error.message : 'Network error' } : p));
      }
      // Update progress based on initiated requests, actual progress will be when polling completes
      setGenerationProgress(Math.round((postsSuccessfullyInitiated / totalPostsToProcess) * 50)); // Cap at 50% for initiation
    }

    if (postsSuccessfullyInitiated === 0 && totalPostsToProcess > 0) {
        setIsGeneratingAll(false);
        toast({ title: "Error", description: "Could not initiate video generation for any post.", variant: "destructive" });
        return;
    }

    // If all posts were synchronous and successful (unlikely with polling)
    const allSyncSuccess = localPosts.every(p => p.generationStatus === 'succeeded');
    if (allSyncSuccess) {
        setAllVideosGenerated(true);
        setIsGeneratingAll(false);
        setGenerationProgress(100);
        toast({ title: "Videos Generated", description: "All videos generated successfully." });
    } else {
        // For async, we wait for polls. Progress bar might show 50% for initiation.
        // Actual completion to 100% and setIsGeneratingAll(false) will be handled by the last poll callback.
        toast({ title: "Generation Started", description: "Video generation process has been initiated for all posts." });
    }
  }

  // Function to regenerate a single video
  const regenerateVideo = async (postId: string | number) => {
    setGeneratingPostId(postId) // For individual spinner
    setLocalPosts(prevPosts =>
      prevPosts.map(p => (p.id === postId ? { ...p, generationStatus: 'pending_request', videoGenerated: false, videoUrl: '/placeholder.mp4', errorMessage: undefined } : p))
    );

    // Clear previous polling interval for this post if any
    if (pollingIntervalsRef.current.has(postId)) {
        clearInterval(pollingIntervalsRef.current.get(postId)!);
        pollingIntervalsRef.current.delete(postId);
    }

    const post = localPosts.find(p => p.id === postId);
    if (!post) {
      toast({ title: "Error", description: "Post not found.", variant: "destructive" });
      setGeneratingPostId(null);
      return;
    }

    const selectedImageUrls = getSelectedImagesForApi(post);

    try {
      const payload = {
        postId: post.id,
        content: post.content,
        imageUrls: selectedImageUrls,
      };

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.taskId) {
          setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, generationStatus: 'generating', generationTaskId: result.taskId } : p));
          pollForVideoStatus(postId, result.taskId);
        } else if (result.videoUrl) {
          setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, videoUrl: result.videoUrl, videoGenerated: true, generationStatus: 'succeeded' } : p));
          if (typeof postId === 'number') {
            await updatePostVideos([{ id: postId, video: result.videoUrl }]);
          }
          toast({ title: "Video Regenerated", description: "The video has been regenerated successfully." });
        } else {
            setLocalPosts(prev => prev.map(p => p.id === postId ? {...p, generationStatus: 'failed', errorMessage: result.error || 'No video URL or task ID received.' } : p));
            toast({ title: "Error", description: result.error || "Failed to regenerate video.", variant: "destructive" });
        }
      } else {
        setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, generationStatus: 'failed', errorMessage: result.error || `API request failed (${response.status})` } : p));
        toast({ title: "Error", description: result.error || "Failed to regenerate video.", variant: "destructive" });
      }
    } catch (error) {
      console.error(`Error regenerating video for post ${postId}:`, error);
      setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, generationStatus: 'failed', errorMessage: error instanceof Error ? error.message : 'Network error' } : p));
      toast({ title: "Error", description: "An unexpected error occurred while regenerating the video.", variant: "destructive" });
    } finally {
      setGeneratingPostId(null);
      // Check if all videos are now generated after this regeneration
      setLocalPosts(currentPosts => {
        const allDone = currentPosts.every(p => p.generationStatus === 'succeeded' || (p.videoUrl && p.videoUrl !== '/placeholder.mp4'));
        if (allDone) {
            setAllVideosGenerated(true);
        }
        return currentPosts;
      });
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
      toast({ title: "Error", description: "Failed to complete video generation", variant: "destructive" });
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

      {!hasPostsWithImages && (
        <div className="bg-yellow-100 border-4 border-black rounded-md p-6 text-center mb-6">
          <p className="text-lg font-bold mb-2">No posts with images available</p>
          <p className="mb-4">
            You can still generate videos for posts without images, or go back to add images first.
          </p>
          {skipIfNoImages && (
            <div className="flex justify-center gap-4">
              <button
                onClick={onBack}
                className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300"
              >
                Back to Images
              </button>
            </div>
          )}
        </div>
      )}

      {isGeneratingAll && generationProgress < 100 && (
        <div className="bg-gray-100 border-4 border-black rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">Generating all videos... ({localPosts.filter(p => p.generationStatus === 'generating' || p.generationStatus === 'pending_request').length} pending)</span>
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

      {/* Only show the Generate All Videos button when not generating and we have posts with images */}
      {!isGeneratingAll && hasPostsWithImages && (
        <div className="flex justify-center mb-4">
          <button
            onClick={generateAllVideos}
            disabled={isGeneratingAll || localPosts.some(p => p.generationStatus === 'generating')}
            className="py-3 px-6 bg-yellow-300 border-4 border-black rounded-md font-bold text-lg hover:bg-yellow-400 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-yellow-300"
          >
            {isGeneratingAll ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Generating Videos...
              </>
            ) : (
              <>
                <Play size={20} />
                {allVideosGenerated ? "Regenerate All Videos" : "Generate All Videos"}
              </>
            )}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {localPosts.map((post, index) => {
          const isGenerating = generatingPostId === post.id
          const hasVideo = post.videoUrl && post.videoUrl !== "/placeholder.mp4"
          const selectedImages = getSelectedImages(post)
          const hasImages = selectedImages.length > 0

          return (
            <div key={post.id} className="border-4 border-black rounded-md p-4 bg-white">
              <div className="flex flex-col gap-4">
                {/* Add post title/ID in the header */}
                <div className="p-4 bg-yellow-100 border-b-4 border-black flex justify-between items-center">
                  <h3 className="font-bold text-lg">{post.title || `Post ${index + 1}`}</h3>
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
                              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-sm">
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
                    {post.generationStatus === 'succeeded' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={16} />
                        Generated
                      </span>
                    ) : post.generationStatus === 'generating' || post.generationStatus === 'pending_request' ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={16} className="animate-spin" />
                        Generating...
                      </span>
                    ) : post.generationStatus === 'failed' ? (
                      <span className="flex items-center gap-1 text-red-500">
                        <AlertTriangle size={16} />
                        Failed {post.errorMessage && post.errorMessage.length > 30 ? `(${post.errorMessage.substring(0,27)}...)` : post.errorMessage ? `(${post.errorMessage})` : ''}
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
                    disabled={generatingPostId === post.id || isGeneratingAll || post.generationStatus === 'generating'}
                    className="py-1 px-3 bg-purple-300 border-2 border-black rounded-md hover:bg-purple-400 flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-300"
                  >
                    {generatingPostId === post.id ? (
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
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70 disabled:transform-none disabled:hover:bg-white"
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
