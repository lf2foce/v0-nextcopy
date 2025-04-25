import type { Post } from "@/components/campaign-workflow"

export interface PostImage {
  url: string
  prompt: string
  order: number
  isSelected: boolean
  metadata?: {
    width: number
    height: string
    style: string
    service?: string
  }
}

// Reduce console logging for tinyurl warnings
// Update the isValidImageUrl function:

export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false

  // Explicitly reject blob URLs
  if (url.startsWith("blob:")) {
    return false
  }

  // Check for common URL patterns
  const isValidPattern = url.startsWith("http") || url.startsWith("/") || url.startsWith("data:image/")

  // Only log tinyurl warnings in development, not in production
  if (url.includes("tinyurl.com") && process.env.NODE_ENV === "development") {
    // Use console.debug instead of console.warn to reduce noise
    console.debug("Potentially problematic tinyurl detected:", url)
  }

  return isValidPattern
}

// Generate placeholder images for a post
export function generatePlaceholderImages(postId: string | number): PostImage[] {
  return [
    {
      url: `/placeholder.svg?height=300&width=400&text=Placeholder_image`,
      prompt: `Placeholder image for post ${postId}`,
      order: 0,
      isSelected: false,
      metadata: {
        width: 400,
        height: "300",
        style: "placeholder",
      },
    },
  ]
}

// Update the getPostImages function to better handle errors
export function getPostImages(post: Post): PostImage[] {
  if (!post.images) return []

  try {
    const imagesData = JSON.parse(post.images)
    const images = imagesData.images?.images || imagesData.images || []

    // Validate and sanitize each image
    return images.map((img: any) => ({
      url: isValidImageUrl(img.url) ? img.url : "/placeholder.svg?text=Invalid+Image",
      prompt: img.prompt || "Image",
      order: img.order || 0,
      isSelected: !!img.isSelected,
      metadata: img.metadata || { style: "default", width: 400, height: "300" },
    }))
  } catch (e) {
    console.error("Error parsing images JSON:", e)
    return []
  }
}

// Check if a post has real images (not placeholders)
export function hasRealImages(post: Post): boolean {
  const images = getPostImages(post)
  if (images.length === 0) return false
  return images.some((img) => !img.url.includes("placeholder.svg") && isValidImageUrl(img.url))
}

// Get the count of selected images for a post
export function getSelectedImagesCount(post: Post): number {
  const images = getPostImages(post)
  return images.filter((img) => img.isSelected).length
}

// Format images data for saving
export function formatImagesData(images: PostImage[]): string {
  return JSON.stringify({
    images: images.map((img, idx) => ({
      ...img,
      order: idx,
    })),
  })
}

// Get the main image URL from a post with validation
export function getMainImageUrl(post: Post): string {
  const images = getPostImages(post)
  const selectedImages = images.filter((img) => img.isSelected && isValidImageUrl(img.url))

  if (selectedImages.length > 0) {
    return selectedImages[0].url
  }

  // Fallback to imageUrl if it's valid
  if (post.imageUrl && isValidImageUrl(post.imageUrl)) {
    return post.imageUrl
  }

  // Final fallback to first valid image or placeholder
  const validImage = images.find((img) => isValidImageUrl(img.url))
  return validImage ? validImage.url : "/placeholder.svg?text=No+Valid+Image"
}
