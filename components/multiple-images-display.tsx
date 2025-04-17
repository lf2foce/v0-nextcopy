"use client"

import { useState } from "react"
import Image from "next/image"

interface ImageData {
  url: string
  prompt: string
  order: number
  isDefault?: boolean
  isSelected?: boolean
  metadata?: {
    width: number
    height: number
    style: string
  }
}

interface ImagesJson {
  images: ImageData[]
}

// Update the props interface
interface MultipleImagesDisplayProps {
  imagesJson: string | null
  defaultImageIndex?: number
  onSelectDefault?: (index: number) => void
  className?: string
  layout?: "grid" | "horizontal"
  showMainImage?: boolean
  videoUrl?: string
  onImageClick?: (index: number) => void
}

// Update the function parameters to include the new prop
export function MultipleImagesDisplay({
  imagesJson,
  defaultImageIndex = 0,
  onSelectDefault,
  className = "",
  layout = "grid",
  showMainImage = true,
  videoUrl,
  onImageClick,
}: MultipleImagesDisplayProps) {
  const [selectedIndex, setSelectedIndex] = useState(defaultImageIndex)

  // Update the parsing logic to be more robust
  // Parse the JSON string
  let imagesData: ImagesJson | null = null
  try {
    if (imagesJson) {
      imagesData = JSON.parse(imagesJson) as ImagesJson

      // Ensure the images array exists
      if (!imagesData.images) {
        imagesData.images = []
      }
    }
  } catch (error) {
    console.error("Error parsing images JSON:", error)
    imagesData = { images: [] }
  }

  // Filter to only show selected images if available
  const allImages = imagesData?.images || []
  const selectedImages = allImages.filter((img) => img.isSelected === true)

  // Use selected images if available, otherwise fall back to all images
  const imagesToDisplay = selectedImages.length > 0 ? selectedImages : allImages

  // If no images data or no images to display, show placeholder or video
  if (!imagesToDisplay.length) {
    if (videoUrl) {
      return (
        <div className={`${className}`}>
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-black">
            <video src={videoUrl} controls className="w-full h-full object-cover" poster="/abstract-thumbnail.png" />
          </div>
        </div>
      )
    }

    return (
      <div className={`flex items-center justify-center p-4 bg-gray-100 rounded-lg border-4 border-black ${className}`}>
        <p className="text-gray-500">No media available</p>
      </div>
    )
  }

  const handleSelectImage = (index: number) => {
    setSelectedIndex(index)
    if (onSelectDefault) {
      onSelectDefault(index)
    }
  }

  // Get the currently selected image
  const selectedImage = imagesToDisplay[selectedIndex] || imagesToDisplay[0]

  // Horizontal layout (no main image, just thumbnails in a row)
  if (layout === "horizontal") {
    return (
      <div className={`${className}`}>
        {videoUrl && (
          <div className="relative aspect-video w-full mb-4 overflow-hidden rounded-lg border-4 border-black">
            <video src={videoUrl} controls className="w-full h-full object-cover" poster="/abstract-thumbnail.png" />
          </div>
        )}

        {imagesToDisplay.length > 0 && (
          <div className="flex overflow-x-auto gap-3 pb-2 snap-x">
            {imagesToDisplay.map((image, index) => (
              <div
                key={index}
                className="relative flex-shrink-0 snap-center cursor-pointer"
                style={{ width: "220px", height: "140px" }}
                onClick={() => onImageClick && onImageClick(index)}
              >
                <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 text-xs rounded z-10">
                  Style: {image.metadata?.style || "default"}
                </div>
                <Image
                  src={image.url || "/placeholder.svg"}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover rounded-lg border-2 border-black"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Default grid layout with main image
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Video if available */}
      {videoUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border-4 border-black">
          <video src={videoUrl} controls className="w-full h-full object-cover" poster="/abstract-thumbnail.png" />
        </div>
      )}

      {/* Main image display */}
      {showMainImage && imagesToDisplay.length > 0 && (
        <div
          className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100 border-4 border-black cursor-pointer"
          onClick={() => onImageClick && onImageClick(selectedIndex)}
        >
          <Image
            src={selectedImage.url || "/placeholder.svg"}
            alt={selectedImage.prompt || "Post image"}
            fill
            className="object-cover"
          />
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 text-xs rounded">
            Style: {selectedImage.metadata?.style || "default"}
          </div>
        </div>
      )}

      {/* Thumbnails */}
      {imagesToDisplay.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {imagesToDisplay.map((image, index) => (
            <button
              key={index}
              onClick={(e) => {
                handleSelectImage(index)
                if (onImageClick) {
                  e.stopPropagation()
                  onImageClick(index)
                }
              }}
              className={`relative aspect-square overflow-hidden rounded-md ${
                index === selectedIndex ? "ring-2 ring-primary ring-offset-2" : "opacity-70"
              }`}
            >
              <Image
                src={image.url || "/placeholder.svg"}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
