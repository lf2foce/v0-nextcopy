"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageData, ImagesData } from "@/types"

interface MultipleImagesDisplayProps {
  imagesJson?: string
  defaultImageIndex?: number
  layout?: "horizontal" | "vertical" | "grid"
  showMainImage?: boolean
  videoUrl?: string
}

export function MultipleImagesDisplay({
  imagesJson,
  defaultImageIndex = 0,
  layout = "horizontal",
  showMainImage = true,
  videoUrl
}: MultipleImagesDisplayProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(defaultImageIndex)
  const [images, setImages] = useState<ImageData[]>([])

  // Parse images JSON when component mounts or imagesJson changes
  useState(() => {
    if (imagesJson) {
      try {
        const parsedData: ImagesData = JSON.parse(imagesJson)
        setImages(parsedData.images || [])
      } catch (error) {
        console.error("Error parsing images JSON:", error)
        setImages([])
      }
    }
  }, [imagesJson])

  if (!images.length && !videoUrl) {
    return (
      <div className="w-full h-64 bg-gray-100 border-4 border-black rounded-md flex items-center justify-center">
        <p className="text-gray-500">No images available</p>
      </div>
    )
  }

  const renderMainImage = () => {
    if (videoUrl) {
      return (
        <div className="relative w-full h-64 border-4 border-black rounded-md overflow-hidden">
          <video
            src={videoUrl}
            controls
            className="w-full h-full object-cover"
          />
        </div>
      )
    }

    if (images.length > 0) {
      const currentImage = images[currentImageIndex]
      return (
        <div className="relative w-full h-64 border-4 border-black rounded-md overflow-hidden">
          <Image
            src={currentImage.url}
            alt={`Image ${currentImageIndex + 1}`}
            fill
            className="object-cover"
          />
          {currentImage.metadata?.style && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Style: {currentImage.metadata.style}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  const renderThumbnails = () => {
    if (!images.length || layout === "vertical") return null

    return (
      <div className={`flex gap-2 mt-2 ${layout === "grid" ? "flex-wrap" : "overflow-x-auto"}`}>
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`relative w-20 h-20 flex-shrink-0 border-2 ${
              index === currentImageIndex ? "border-blue-500" : "border-black"
            } rounded-md overflow-hidden`}
            title={`View image ${index + 1}`}
          >
            <Image
              src={image.url}
              alt={`Thumbnail ${index + 1}`}
              fill
              className="object-cover"
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {showMainImage && renderMainImage()}
      {renderThumbnails()}
    </div>
  )
}
