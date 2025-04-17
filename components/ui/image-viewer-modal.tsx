"use client"

import { useEffect, useRef, useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface ImageViewerModalProps {
  images: Array<{
    url: string
    prompt?: string
    metadata?: {
      style?: string
      width?: number
      height?: number | string
    }
  }>
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export default function ImageViewerModal({ images, initialIndex = 0, isOpen, onClose }: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const modalRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageError, setImageError] = useState(false)

  // Reset current index when images change
  useEffect(() => {
    setCurrentIndex(initialIndex)
    setImageError(false)
  }, [images, initialIndex])

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

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return

      if (event.key === "Escape") {
        onClose()
      } else if (event.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
      } else if (event.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, images.length, onClose])

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentIndex]

  // Handle image load error
  const handleImageError = () => {
    console.error("Failed to load image:", currentImage.url)
    setImageError(true)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white border-4 border-black rounded-lg max-w-5xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b-4 border-black bg-yellow-100">
          <h3 className="text-xl font-bold">
            Image {currentIndex + 1} of {images.length}
            {currentImage.metadata?.style && ` - Style: ${currentImage.metadata.style}`}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black rounded-md hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Image container - Updated for 9:16 aspect ratio */}
        <div className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {imageError ? (
              <div className="flex flex-col items-center justify-center text-white">
                <p>Failed to load image</p>
                <p className="text-sm text-gray-400 mt-2">URL: {currentImage.url}</p>
              </div>
            ) : (
              <img
                ref={imageRef}
                src={currentImage.url || "/placeholder.svg"}
                alt={currentImage.prompt || `Image ${currentIndex + 1}`}
                className="max-h-[70vh] max-w-full object-contain"
                style={{ margin: "0 auto" }}
                onError={handleImageError}
              />
            )}
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                className="absolute left-4 p-2 bg-white/80 border-2 border-black rounded-full hover:bg-white"
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                className="absolute right-4 p-2 bg-white/80 border-2 border-black rounded-full hover:bg-white"
                aria-label="Next image"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {/* Image details */}
        <div className="p-4 bg-white">
          {currentImage.prompt && (
            <p className="text-gray-700 mb-2">
              <span className="font-bold">Prompt:</span> {currentImage.prompt}
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            {currentImage.metadata && (
              <>
                {currentImage.metadata.style && (
                  <span className="py-1 px-3 bg-blue-100 border-2 border-blue-300 rounded-md text-sm">
                    Style: {currentImage.metadata.style}
                  </span>
                )}
                {currentImage.metadata.width && currentImage.metadata.height && (
                  <span className="py-1 px-3 bg-purple-100 border-2 border-purple-300 rounded-md text-sm">
                    {currentImage.metadata.width} × {currentImage.metadata.height}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="p-4 border-t-4 border-black bg-gray-100 overflow-x-auto">
            <div className="flex gap-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative w-16 h-16 flex-shrink-0 border-2 ${
                    index === currentIndex ? "border-yellow-400" : "border-black"
                  } rounded-md overflow-hidden`}
                >
                  <img
                    src={image.url || "/placeholder.svg"}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Replace with placeholder on error
                      ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
