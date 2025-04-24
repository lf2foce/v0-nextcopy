"use client"

import { useState } from "react"
import Image from "next/image"
import { isValidImageUrl } from "@/lib/image-generation-utils"

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
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

  // Handle image error
  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({
      ...prev,
      [index]: true,
    }))
  }

  // Parse the JSON string with improved error handling
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

  // Filter to only show valid images (no blob URLs)
  const allImages = imagesData?.images || []
  const validImages = allImages.filter((img) => {
    return img && img.url && !img.url.startsWith("blob:") && isValidImageUrl(img.url)
  })

  // Filter to only show selected images if available
  const selectedImages = validImages.filter((img) => img.isSelected === true)

  // Use selected images if available, otherwise fall back to all valid images
  const imagesToDisplay = selectedImages.length > 0 ? selectedImages : validImages

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
            {imagesToDisplay.map((image, index) => {
              // Add explicit check for blob URLs in the image rendering
              const isBlobUrl = image.url?.startsWith("blob:")
              const hasError = imageErrors[index] || isBlobUrl || !isValidImageUrl(image.url)

              return (
                <div
                  key={index}
                  className="relative flex-shrink-0 snap-center cursor-pointer"
                  style={{ width: "220px", height: "140px" }}
                  onClick={() => !hasError && onImageClick && onImageClick(index)}
                >
                  {hasError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 border-2 border-gray-300 rounded-lg">
                      <span className="text-xs text-gray-500 text-center px-2">
                        {isBlobUrl ? "Blob URL not supported" : "Image unavailable"}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 text-xs rounded z-10">
                        Style: {image.metadata?.style || "default"}
                      </div>
                      <Image
                        src={image.url || "/placeholder.svg?text=No+Image"}
                        alt={`Image ${index + 1}`}
                        fill
                        className="object-cover rounded-lg border-2 border-black"
                        onError={() => handleImageError(index)}
                        unoptimized // Skip optimization to avoid issues with external URLs
                      />
                    </>
                  )}
                </div>
              )
            })}
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
          {imageErrors[selectedIndex] || !isValidImageUrl(selectedImage.url) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
              <span className="text-gray-500">Image unavailable</span>
            </div>
          ) : (
            <>
              <Image
                src={selectedImage.url || "/placeholder.svg?text=No+Image"}
                alt={selectedImage.prompt || "Post image"}
                fill
                className="object-cover"
                onError={() => handleImageError(selectedIndex)}
                unoptimized // Skip optimization to avoid issues with external URLs
              />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 text-xs rounded">
                Style: {selectedImage.metadata?.style || "default"}
              </div>
            </>
          )}
        </div>
      )}

      {/* Thumbnails */}
      {imagesToDisplay.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {imagesToDisplay.map((image, index) => {
            // Add explicit check for blob URLs in the image rendering
            const isBlobUrl = image.url?.startsWith("blob:")
            const hasError = imageErrors[index] || isBlobUrl || !isValidImageUrl(image.url)

            return (
              <button
                key={index}
                onClick={(e) => {
                  if (!hasError) {
                    handleSelectImage(index)
                    if (onImageClick) {
                      e.stopPropagation()
                      onImageClick(index)
                    }
                  }
                }}
                className={`relative aspect-square overflow-hidden rounded-md ${
                  index === selectedIndex && !hasError ? "ring-2 ring-primary ring-offset-2" : "opacity-70"
                } ${hasError ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                {hasError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                    <span className="text-xs text-gray-500">{isBlobUrl ? "Blob URL not supported" : "Error"}</span>
                  </div>
                ) : (
                  <Image
                    src={image.url || "/placeholder.svg?text=No+Image"}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(index)}
                    unoptimized // Skip optimization to avoid issues with external URLs
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
