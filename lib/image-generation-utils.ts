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

// Get images from a post
export function getPostImages(post: Post): PostImage[] {
  if (!post.images) return []

  try {
    const imagesData = JSON.parse(post.images)
    return imagesData.images?.images || imagesData.images || []
  } catch (e) {
    console.error("Error parsing images JSON:", e)
    return []
  }
}

// Check if a post has real images (not placeholders)
export function hasRealImages(post: Post): boolean {
  const images = getPostImages(post)
  if (images.length === 0) return false
  return images.some((img) => !img.url.includes("placeholder.svg"))
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

// Get the main image URL from a post
export function getMainImageUrl(post: Post): string {
  const images = getPostImages(post)
  const selectedImages = images.filter((img) => img.isSelected)

  if (selectedImages.length > 0) {
    return selectedImages[0].url
  }

  return post.imageUrl || (images.length > 0 ? images[0].url : "")
}
