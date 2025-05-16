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
        className="bg-white border-4 border-black rounded-lg max-w-7xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[95vh] overflow-hidden flex flex-col"
      >
        <div className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden">
          <div className="flex-1 bg-gray-900 flex flex-col md:flex-row items-stretch justify-center overflow-hidden">
            {/* Image on the left (desktop) / top (mobile) */}
            <div
              className="
                relative w-full md:w-1/3
                h-2/3 md:h-full
                flex items-center justify-center
                overflow-y-auto
              "
              style={{
                maxHeight: "85vh",
                height: "66.6667vh", // 2/3 of viewport height for mobile
                // Remove height for md and up
                ...(window.innerWidth >= 768 ? { height: "auto" } : {}),
              }}
            >
              {imageError ? (
                <div className="flex flex-col items-center justify-center text-white">
                  <p>Failed to load image</p>
                  <p className="text-sm text-gray-400 mt-2">URL: {currentImage.url}</p>
                </div>
              ) : currentImage ? (
                <img
                  ref={imageRef}
                  src={currentImage.url || "/placeholder.svg"}
                  alt={currentImage.prompt || `Image ${currentIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                  style={{ margin: 0 }}
                  onError={handleImageError}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-white">
                  <p>No image available</p>
                </div>
              )}
              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 border-2 border-black rounded-full hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 border-2 border-black rounded-full hover:bg-white"
                    aria-label="Next image"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
            {/* Details and thumbnails on the right (desktop) / bottom (mobile) */}
            <div
              className="
                w-full md:w-2/3
                h-1/3 md:h-full
                flex flex-col justify-between bg-white p-6 overflow-y-auto
              "
              style={{
                maxHeight: "85vh",
                height: "33.3333vh", // 1/3 of viewport height for mobile
                // Remove height for md and up
                ...(window.innerWidth >= 768 ? { height: "auto" } : {}),
              }}
            >
              {/* Header */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold bg-yellow-100 px-2 py-1 rounded-sm">
                    Image {currentIndex + 1} of {images.length}
                    {currentImage.metadata?.style && ` - Style: ${currentImage.metadata.style}`}
                  </h3>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center bg-white border-2 border-black rounded-md hover:bg-gray-100 transition-colors ml-2"
                  >
                    <X size={20} />
                  </button>
                </div>
                {currentImage.prompt && (
                  <p className="text-gray-700 mb-2">
                    <span className="font-bold">Prompt:</span> {currentImage.prompt}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mb-2">
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
                <div className="text-gray-500 text-sm mb-4">
                  Image {currentIndex + 1} of {images.length}
                </div>
              </div>
              {/* Thumbnails - always at the bottom */}
              {images.length > 1 && (
                <div className="border-t-4 border-black bg-gray-100 overflow-x-auto py-2 mt-2">
                  <div className="flex gap-2">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`relative w-16 h-16 shrink-0 border-2 ${
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
        </div>
      </div>
    </div>
  )
}
