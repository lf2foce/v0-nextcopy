"use client"

import { useEffect, useRef } from "react"
import { X, Calendar, Instagram, Hash } from "lucide-react"
import { Post, PostModalProps } from "@/types"
import { MultipleImagesDisplay } from "@/components/multiple-images-display"

export default function PostModal({ post, isOpen, onClose }: PostModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "auto"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Extract hashtags from content
  const hashtags = post.content.split(" ").filter((word) => word.startsWith("#"))

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      style={{ alignItems: "center" }}
    >
      <div
        ref={modalRef}
        className="bg-white border-4 border-black rounded-lg max-w-3xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto"
        style={{
          position: "relative",
          top: "auto",
          transform: "none",
          margin: "0 auto",
        }}
      >
        {/* Header with close button */}
        <div className="flex justify-between items-center p-6 border-b-4 border-black bg-yellow-100">
          <h3 className="text-2xl font-black">{post.status === "posted" ? "Content Published" : "Post Preview"}</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black rounded-md hover:bg-gray-100 transition-colors"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Media section - Images and Video */}
          <div className="mb-6">
            <MultipleImagesDisplay
              imagesJson={post.images || post.imagesJson}
              defaultImageIndex={post.defaultImageIndex || 0}
              layout="horizontal"
              showMainImage={false}
              videoUrl={post.videoUrl}
            />
          </div>

          {/* Content section with neo-brutalist styling */}
          <div className="space-y-6">
            <div className="bg-green-100 border-4 border-black rounded-md p-4">
              <div className="flex items-center gap-2 mb-2">
                <Instagram size={20} className="text-black" />
                <h4 className="font-bold text-lg">Post Content</h4>
              </div>
              <p className="text-lg">{post.content}</p>
            </div>

            {/* Hashtags section */}
            {hashtags.length > 0 && (
              <div className="bg-blue-100 border-4 border-black rounded-md p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Hash size={20} className="text-black" />
                  <h4 className="font-bold text-lg">Hashtags</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((hashtag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-300 border-2 border-black rounded-md text-sm font-bold"
                    >
                      {hashtag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule info */}
            <div className="bg-purple-100 border-4 border-black rounded-md p-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-black" />
                <h4 className="font-bold text-lg">Publishing Details</h4>
              </div>
              <p className="mt-2">
                {post.status === "posted"
                  ? "This content has been published to your social media channels."
                  : "This post will be published according to your campaign schedule."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
