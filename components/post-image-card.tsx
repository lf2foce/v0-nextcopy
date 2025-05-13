"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import type { Post } from "./campaign-workflow"
import { RefreshCw, Loader2, Check, AlertCircle, MinusCircle, PlusCircle, ChevronDown, ImageIcon, UploadCloud } from "lucide-react"
import { UploadButton } from "@/lib/uploadthing";
import { getPostImages, hasRealImages } from "@/lib/image-generation-utils"

// Available image styles
export const IMAGE_STYLES = [
  { value: "realistic", label: "Realistic" },
  { value: "cartoon", label: "Cartoon" },
  { value: "illustration", label: "Illustration" },
  { value: "watercolor", label: "Watercolor" },
  { value: "sketch", label: "Sketch" },
  { value: "ghibli", label: "Ghibli" },
  { value: "pixel_art", label: "Pixel Art" },
  { value: "oil_painting", label: "Oil Painting" },
]

// Available image services
export const IMAGE_SERVICES = [
  { value: "flux", label: "Flux" },
  { value: "gemini", label: "Gemini" },
  { value: "ideogram", label: "Ideogram" },
]

interface PostImageCardProps {
  post: Post
  index: number
  isGenerating: boolean
  isPolling: boolean
  hasError: boolean
  errorMessage?: string
  numImages: number
  imageStyle: string
  imageService: string
  isSubmitting: boolean
  onRegenerateImages: (postId: string | number) => void
  onToggleImageSelection: (postId: string | number, imageIndex: number) => void
  onChangeNumImages: (postId: string | number, value: number) => void
  onChangeImageStyle: (postId: string | number, style: string) => void
  onChangeImageService: (postId: string | number, service: string) => void
  onImageUpload: (postId: string | number, imageUrls: string[]) => void
}

export default function PostImageCard({
  post,
  index,
  isGenerating,
  isPolling,
  hasError,
  errorMessage,
  numImages,
  imageStyle,
  imageService,
  isSubmitting,
  onRegenerateImages,
  onToggleImageSelection,
  onChangeNumImages,
  onChangeImageStyle,
  onChangeImageService,
  onImageUpload,
}: PostImageCardProps) {
  const isProcessing = isGenerating || isPolling
  const postImages = getPostImages(post)
  const hasGeneratedImages = hasRealImages(post)

  // Get post title - use content as fallback if no title
  const postTitle =
    post.title || post.content?.substring(0, 30) + (post.content?.length > 30 ? "..." : "") || `Post ${index + 1}`

  // Dropdown state
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false)
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false)
  const styleDropdownRef = useRef<HTMLDivElement>(null)
  const serviceDropdownRef = useRef<HTMLDivElement>(null)

  // Track image loading errors
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

  // Track if content is expanded
  const [isContentExpanded, setIsContentExpanded] = useState(false)

  // Track viewport size
  const [isMobile, setIsMobile] = useState(false)

  // Check viewport size on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    // Initial check
    checkMobile()

    // Add resize listener
    window.addEventListener("resize", checkMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
        setStyleDropdownOpen(false)
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setServiceDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle dropdown clicks
  const toggleStyleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setStyleDropdownOpen(!styleDropdownOpen)
    setServiceDropdownOpen(false)
  }

  const toggleServiceDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setServiceDropdownOpen(!serviceDropdownOpen)
    setStyleDropdownOpen(false)
  }

  const selectStyle = (style: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChangeImageStyle(post.id, style)
    setStyleDropdownOpen(false)
  }

  const selectService = (service: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChangeImageService(post.id, service)
    setServiceDropdownOpen(false)
  }

  // Handle image error
  const handleImageError = (imageIndex: number) => {
    console.log(`Image error at index ${imageIndex}`)
    setImageErrors((prev) => ({
      ...prev,
      [imageIndex]: true,
    }))
  }

  // Log when numImages changes
  useEffect(() => {
    console.debug(`Post ${post.id}: Number of images set to ${numImages}`)
  }, [numImages, post.id])

  return (
    <div className="border-4 border-black rounded-md overflow-hidden bg-white">
      <div className="p-4 bg-yellow-100 border-b-4 border-black">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Selection count */}
          <div className="text-sm font-medium">
            {hasGeneratedImages
              ? `${postImages.filter((img) => img.isSelected).length} of ${postImages.length} selected`
              : "No images selected"}
          </div>

          {/* Image generation controls - now more responsive */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Number of images selector */}
            <div className="flex items-center gap-2 bg-white border-2 border-black rounded-md px-2 py-1">
              <button
                onClick={() => onChangeNumImages(post.id, Math.max(1, numImages - 1))}
                disabled={numImages <= 1 || isProcessing}
                className="text-black hover:text-gray-700 disabled:opacity-50"
                aria-label="Decrease number of images"
              >
                <MinusCircle size={16} />
              </button>
              <span className="text-sm font-medium w-5 text-center">{numImages}</span>
              <button
                onClick={() => onChangeNumImages(post.id, Math.min(4, numImages + 1))}
                disabled={numImages >= 10 || isProcessing}
                className="text-black hover:text-gray-700 disabled:opacity-50"
                aria-label="Increase number of images"
              >
                <PlusCircle size={16} />
              </button>
            </div>

            {/* Style selector dropdown - responsive width */}
            <div className="relative" ref={styleDropdownRef}>
              <button
                onClick={toggleStyleDropdown}
                disabled={isProcessing}
                className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1 text-sm w-24 sm:w-32 disabled:opacity-50"
              >
                <span className="truncate">
                  {IMAGE_STYLES.find((style) => style.value === imageStyle)?.label || "Realistic"}
                </span>
                <ChevronDown size={14} className={styleDropdownOpen ? "transform rotate-180" : ""} />
              </button>

              {styleDropdownOpen && (
                <div className="absolute z-10 mt-1 w-40 bg-white border-2 border-black rounded-md shadow-lg">
                  {IMAGE_STYLES.map((style) => (
                    <button
                      key={style.value}
                      onClick={(e) => selectStyle(style.value, e)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        imageStyle === style.value ? "bg-yellow-100 font-medium" : ""
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image service selector dropdown - responsive width */}
            <div className="relative" ref={serviceDropdownRef}>
              <button
                onClick={toggleServiceDropdown}
                disabled={isProcessing}
                className="flex items-center justify-between gap-1 bg-white border-2 border-black rounded-md px-3 py-1 text-sm w-24 sm:w-32 disabled:opacity-50"
              >
                <span className="truncate">
                  {IMAGE_SERVICES.find((service) => service.value === imageService)?.label || "Flux"}
                </span>
                <ChevronDown size={14} className={serviceDropdownOpen ? "transform rotate-180" : ""} />
              </button>

              {serviceDropdownOpen && (
                <div className="absolute z-10 mt-1 w-40 bg-white border-2 border-black rounded-md shadow-lg">
                  {IMAGE_SERVICES.map((service) => (
                    <button
                      key={service.value}
                      onClick={(e) => selectService(service.value, e)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        imageService === service.value ? "bg-yellow-100 font-medium" : ""
                      }`}
                    >
                      {service.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            

            {/* Regenerate button - full width on mobile */}
            <button
              onClick={() => onRegenerateImages(post.id)}
              disabled={isProcessing || isSubmitting}
              className={`py-1 px-3 bg-purple-300 border-2 border-black rounded-md hover:bg-purple-400 
                flex items-center gap-1 text-sm disabled:opacity-50 ${isMobile ? "w-full justify-center mt-2" : ""}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {isPolling ? "Generating..." : "Regenerating..."}
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  {hasGeneratedImages ? "Regenerate Images" : "Generate Images"}
                </>
              )}
            </button>

            {/* Upload Button */}
            <UploadButton
  endpoint="imageUploader"
  content={{
    button({ isUploading }) {
      return (
        <div className="flex items-center gap-1">
          {isUploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <UploadCloud size={14} />
          )}
          {isUploading ? "Uploading..." : "Upload Images"}
        </div>
      );
    },
    allowedContent: ""
  }}
  appearance={{
    button: "rounded-md text-sm flex items-center justify-center",
    container: "w-auto",
    allowedContent: "hidden"
  }}
  onClientUploadComplete={(res) => {
    if (res && res.length > 0) {
      const urls = res.map(file => file.ufsUrl);
      onImageUpload(post.id, urls);
    }
  }}
  onUploadError={(error: Error) => {
    alert(`ERROR! ${error.message}`);
  }}
  className={`py-1 px-3 ${isMobile ? "w-full mt-2" : ""}`}
  disabled={isProcessing || isSubmitting}
/>
          </div>
        </div>

        {/* Post title moved below controls */}
        <h3 className="font-bold text-lg mt-3 border-t-2 border-black/20 pt-3">{postTitle}</h3>
      </div>

      <div className="p-4">
        {post.content && (
          <div className="mb-4">
            {post.content.length > 150 ? (
              <div>
                <p className="text-lg">{isContentExpanded ? post.content : `${post.content.substring(0, 150)}...`}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsContentExpanded(!isContentExpanded)
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 mt-1"
                >
                  {isContentExpanded ? "Show less" : "See more"}
                </button>
              </div>
            ) : (
              <p className="text-lg">{post.content}</p>
            )}
          </div>
        )}

        {isProcessing ? (
          <div className="h-64 flex flex-col items-center justify-center bg-gray-50 border-2 border-gray-300 border-dashed rounded-lg">
            <Loader2 size={32} className="animate-spin text-black mb-2" />
            <span className="font-medium text-center px-4">
              Generating {numImages} {IMAGE_STYLES.find((style) => style.value === imageStyle)?.label || "Realistic"}{" "}
              style image
              {numImages > 1 ? "s" : ""} using{" "}
              {IMAGE_SERVICES.find((service) => service.value === imageService)?.label || "Flux"}...
            </span>
            {isPolling && (
              <p className="text-sm text-gray-500 mt-2 text-center px-4">This may take a minute. Please wait...</p>
            )}
          </div>
        ) : hasError ? (
          <div className="h-64 flex flex-col items-center justify-center bg-red-50 border-2 border-red-300 border-dashed rounded-lg p-4">
            <AlertCircle size={32} className="text-red-500 mb-2" />
            <p className="font-medium text-red-700 text-center">Error generating images</p>
            <p className="text-sm text-red-600 text-center mt-2">{errorMessage}</p>
          </div>
        ) : hasGeneratedImages ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {postImages.map((image, imageIndex) => {
                // Skip rendering blob URLs entirely
                const isBlobUrl = image.url?.startsWith("blob:")
                // Check for tinyurl links that might be problematic
                const isTinyUrl = image.url?.includes("tinyurl.com")
                const hasError = imageErrors[imageIndex] || isBlobUrl

                return (
                  <div
                    key={imageIndex}
                    onClick={() => !hasError && onToggleImageSelection(post.id, imageIndex)}
                    className={`relative border-4 ${
                      image.isSelected && !hasError ? "border-green-500" : "border-black"
                    } rounded-md overflow-hidden h-40 cursor-pointer ${hasError ? "cursor-not-allowed" : ""}`}
                  >
                    {isBlobUrl || hasError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                        <ImageIcon size={32} className="text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500 text-center px-2">
                          {isBlobUrl ? "Blob URL not supported" : "Image unavailable"}
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <Image
                          src={image.url || "/placeholder.svg?text=No+Image"}
                          alt={image.prompt || `Image ${imageIndex + 1}`}
                          fill
                          className="object-cover"
                          onError={() => handleImageError(imageIndex)}
                          unoptimized // Skip optimization to avoid issues with external URLs
                          loading="eager" // Load immediately to detect errors faster
                        />
                      </div>
                    )}

                    {!hasError && (
                      <>
                        <div
                          className={`absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center rounded-full ${
                            image.isSelected ? "bg-green-500 text-white" : "bg-white border-2 border-black"
                          }`}
                        >
                          {image.isSelected && <Check size={16} />}
                        </div>
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
                          {image.metadata?.service
                            ? `${image.metadata.service} - ${image.metadata.style || imageStyle}`
                            : `Style: ${image.metadata?.style || imageStyle}`}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-gray-600">Click on an image to select or deselect it.</p>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 border-2 border-gray-300 border-dashed rounded-lg">
            <span className="ml-2 font-medium">No images generated yet.</span>
          </div>
        )}
      </div>
    </div>
  )
}
