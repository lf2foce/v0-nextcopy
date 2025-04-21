"use client"

import { useEffect, useRef, useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { ImageData } from "@/types"

interface ImageViewerModalProps {
  images: ImageData[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
}

export default function ImageViewerModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose
}: ImageViewerModalProps) {
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

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className="bg-white border-4 border-black rounded-lg max-w-4xl w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
      >
        <div className="flex justify-between items-center p-4 border-b-4 border-black">
          <h3 className="text-xl font-bold">Image {currentIndex + 1} of {images.length}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative aspect-video w-full">
          <Image
            src={currentImage.url}
            alt={`Image ${currentIndex + 1}`}
            fill
            className="object-contain"
          />

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 border-2 border-black rounded-full hover:bg-white"
                title="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/80 border-2 border-black rounded-full hover:bg-white"
                title="Next image"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>

        {currentImage.metadata?.style && (
          <div className="p-4 border-t-4 border-black">
            <p className="text-sm text-gray-600">
              Style: {currentImage.metadata.style}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
