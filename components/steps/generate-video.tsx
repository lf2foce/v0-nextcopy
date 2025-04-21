"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import type { Post } from "../campaign-workflow"
import { Loader2, RefreshCw, Play, CheckCircle, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updatePostVideos } from "@/lib/actions"
import { MultipleImagesDisplay } from "@/components/multiple-images-display"
import { Button } from "@/components/ui/button"

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
  onComplete: (posts: Post[]) => void
  onBack: () => void
}

export default function GenerateVideo({
  posts,
  onComplete,
  onBack
}: GenerateVideoProps) {
  const [localPosts, setLocalPosts] = useState<Post[]>(posts)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentPostIndex, setCurrentPostIndex] = useState(0)
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null)
  const { toast } = useToast()

  const handleGenerateVideo = async (postId: string | number) => {
    setIsGenerating(true)
    try {
      // Mock video generation - replace with actual API call
      const mockVideoUrl = "https://example.com/video.mp4"

      // Update the post with generated video
      setLocalPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                videoUrl: mockVideoUrl,
                videoGenerated: true
              }
            : post
        )
      )

      // Move to next post
      if (currentPostIndex < posts.length - 1) {
        setCurrentPostIndex(prev => prev + 1)
      }
    } catch (error) {
      console.error("Error generating video:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleComplete = () => {
    onComplete(localPosts)
  }

  const currentPost = localPosts[currentPostIndex]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Generate Videos</h2>
        <p className="text-gray-700">Generate videos for your posts</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-yellow-100 border-4 border-black rounded-md">
          <h3 className="font-bold mb-2">Post {currentPostIndex + 1} of {posts.length}</h3>
          <p className="mb-4">{currentPost.content}</p>

          <MultipleImagesDisplay
            imagesJson={currentPost.images || currentPost.imagesJson}
            defaultImageIndex={currentPost.defaultImageIndex || 0}
            layout="grid"
            videoUrl={currentPost.videoUrl}
          />
        </div>

        <div className="flex gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            disabled={isGenerating}
          >
            Back
          </Button>

          {!currentPost.videoUrl && (
            <Button
              onClick={() => handleGenerateVideo(currentPost.id)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Video"
              )}
            </Button>
          )}

          {currentPost.videoUrl && currentPostIndex === posts.length - 1 && (
            <Button onClick={handleComplete}>
              Continue
            </Button>
          )}
        </div>
      </div>

      {/* Video Modal */}
      {videoModalUrl && (
        <VideoModal videoUrl={videoModalUrl} isOpen={!!videoModalUrl} onClose={() => setVideoModalUrl(null)} />
      )}
    </div>
  )
}
