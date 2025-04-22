"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import type { Post } from "@/types"
import { RefreshCw, Loader2, ArrowRight, ImageIcon } from "lucide-react"
import { updatePostImages } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface GenerateImagesProps {
  posts: Post[]
  onComplete: (postsWithImages: Post[]) => void
  onBack: () => void
}

// Unsplash collections for different categories
const unsplashCollections = {
  summer: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1527090526205-beaac8dc3c62?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1517495306984-f84210f9daa8?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1445307806294-bff7f67ff225?q=80&w=600&auto=format&fit=crop",
  ],
  fashion: [
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1479064555552-3ef4979f8908?q=80&w=600&auto=format&fit=crop",
  ],
  product: [
    "https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop",
  ],
  lifestyle: [
    "https://images.unsplash.com/photo-1511988617509-a57c8a288659?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542596594-649edbc13630?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=600&auto=format&fit=crop",
  ],
}

export default function GenerateImages({ posts, onComplete, onBack }: GenerateImagesProps) {
  const [generatingAll, setGeneratingAll] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | number | null>(null)
  const [postsWithImages, setPostsWithImages] = useState<Post[]>(posts)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [allImagesGenerated, setAllImagesGenerated] = useState(false)
  const { toast } = useToast()

  // Check if posts already have images (for when returning to this step)
  useEffect(() => {
    // Initialize postsWithImages with the provided posts
    setPostsWithImages(posts)

    // Check if ALL posts have valid images
    const hasAllImages = posts.every((post) => {
      const imageUrl = post.image || post.imageUrl
      return imageUrl && imageUrl !== "/placeholder.svg" && !imageUrl.includes("placeholder")
    })

    setAllImagesGenerated(hasAllImages)
  }, [posts])

  // Generate a mock image URL from Unsplash based on post content
  const generateMockImageUrl = (post: Post) => {
    const content = post.content.toLowerCase()
    let category = "lifestyle" // default category

    // Determine the best category based on post content
    if (content.includes("summer") || content.includes("hot") || content.includes("beach")) {
      category = "summer"
    } else if (content.includes("fashion") || content.includes("style") || content.includes("wear")) {
      category = "fashion"
    } else if (content.includes("product") || content.includes("item") || content.includes("collection")) {
      category = "product"
    }

    // Get the collection for the category
    const collection = unsplashCollections[category as keyof typeof unsplashCollections]

    // Get a random image from the collection
    const randomIndex = Math.floor(Math.random() * collection.length)
    return collection[randomIndex]
  }

  const generateAllImages = async () => {
    setGeneratingAll(true)
    setGenerationProgress(0)

    const updatedPosts = [...postsWithImages]
    const postsToUpdate: { id: number; image: string }[] = []

    // Generate images one by one with visual progress
    for (let i = 0; i < updatedPosts.length; i++) {
      // Simulate API call delay for each image
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Generate a realistic mock image URL from Unsplash
      const newImage = generateMockImageUrl(updatedPosts[i])

      // Update the post with a generated image
      updatedPosts[i] = {
        ...updatedPosts[i],
        image: newImage,
        imageUrl: newImage, // Set both image and imageUrl to ensure consistency
        imageGenerated: true,
      }

      // If the post has a numeric ID, add it to the list to update in the database
      if (typeof updatedPosts[i].id === "number") {
        postsToUpdate.push({
          id: updatedPosts[i].id as number,
          image: newImage,
        })
      }

      // Update progress
      setGenerationProgress(Math.round(((i + 1) / updatedPosts.length) * 100))
      setPostsWithImages([...updatedPosts])
    }

    // Update post images in the database if we have numeric IDs
    if (postsToUpdate.length > 0) {
      try {
        const result = await updatePostImages(postsToUpdate)

        if (!result.success) {
          toast({
            title: "Warning",
            description: "Some images may not have been saved to the database",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Images generated",
            description: "All images have been generated and saved successfully.",
          })
          setAllImagesGenerated(true)
        }
      } catch (error) {
        console.error("Error updating post images:", error)
        toast({
          title: "Warning",
          description: "Images generated but not saved to database",
          variant: "destructive",
        })
      }
    }

    setGeneratingAll(false)
  }

  const regenerateImage = async (postId: string | number) => {
    setRegeneratingId(postId)

    try {
      // Find the post to regenerate
      const post = postsWithImages.find((p) => p.id === postId)
      if (!post) {
        throw new Error("Post not found")
      }

      // Generate a new image URL from Unsplash
      const newImage = generateMockImageUrl(post)

      // Update the specific post with a new image
      setPostsWithImages((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                image: newImage,
                imageUrl: newImage, // Set both image and imageUrl to ensure consistency
                imageGenerated: true,
              }
            : post,
        ),
      )

      // Update the image in the database if we have a numeric ID
      if (typeof postId === "number") {
        const result = await updatePostImages([{ id: postId, image: newImage }])

        if (!result.success) {
          toast({
            title: "Warning",
            description: "Image regenerated but not saved to database",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Image regenerated",
            description: "The image has been regenerated and saved successfully.",
          })
        }
      }
    } catch (error) {
      console.error("Error regenerating image:", error)
      toast({
        title: "Error",
        description: "Failed to regenerate image",
        variant: "destructive",
      })
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleApproveImages = async () => {
    // Only proceed if we have a campaign ID
    if (postsWithImages.length > 0 && typeof postsWithImages[0].campaignId === "number") {
      try {
        // Call onComplete to move to the next step
        onComplete(postsWithImages)
      } catch (error) {
        console.error("Error updating campaign step:", error)
        toast({
          title: "Error",
          description: "Failed to approve images",
          variant: "destructive",
        })
      }
    } else {
      // If we don't have a campaign ID, just move to the next step
      onComplete(postsWithImages)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Generate Images</h2>
        <p className="text-gray-700">Create images for your posts based on their content</p>
      </div>

      {generatingAll && (
        <div className="bg-gray-100 border-4 border-black rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">Generating images...</span>
            <span className="font-bold">{generationProgress}%</span>
          </div>
          <div className="w-full bg-gray-300 h-4 rounded-md border-2 border-black overflow-hidden">
            <div
              className="bg-yellow-300 h-full transition-all duration-300 ease-out"
              style={{ width: `${generationProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Always show the Generate All Images button when not generating */}
      {!generatingAll && (
        <div className="flex justify-center mb-4">
          <button
            onClick={generateAllImages}
            disabled={generatingAll}
            className="py-3 px-6 bg-yellow-300 border-4 border-black rounded-md font-bold text-lg hover:bg-yellow-400 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
          >
            <ImageIcon size={20} />
            {allImagesGenerated ? "Regenerate All Images" : "Generate All Images"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {postsWithImages.map((post) => {
          const isRegenerating = regeneratingId === post.id
          const hasImage =
            (post.image || post.imageUrl) &&
            (post.image !== "/placeholder.svg" || post.imageUrl !== "/placeholder.svg") &&
            (!post.image?.includes("placeholder") || !post.imageUrl?.includes("placeholder"))

          return (
            <div key={post.id} className="border-4 border-black rounded-md p-4 bg-white">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3 relative h-48 md:h-auto">
                  {isRegenerating || (!hasImage && generatingAll) ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-md">
                      <Loader2 size={32} className="animate-spin text-black" />
                    </div>
                  ) : hasImage ? (
                    <Image
                      src={post.image || post.imageUrl || "/placeholder.svg"}
                      alt="Generated image"
                      fill
                      className="object-cover rounded-md"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 rounded-md">
                      <ImageIcon size={32} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">No image generated</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-lg mb-4">{post.content}</p>

                  <button
                    onClick={() => regenerateImage(post.id)}
                    disabled={isRegenerating || generatingAll}
                    className="py-1 px-3 bg-yellow-300 border-2 border-black rounded-md hover:bg-yellow-400 flex items-center gap-1 text-sm disabled:opacity-50"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        {hasImage ? "Regenerate Image" : "Generate Image"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={generatingAll || regeneratingId !== null}
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
        >
          Back
        </button>
        <button
          onClick={handleApproveImages}
          disabled={
            generatingAll || regeneratingId !== null || postsWithImages.some((post) => !post.image && !post.imageUrl)
          }
          className="flex-1 py-3 px-6 bg-yellow-300 border-4 border-black rounded-md font-bold text-lg hover:bg-yellow-400 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70 disabled:transform-none disabled:hover:bg-yellow-300 flex items-center justify-center gap-2"
        >
          Approve Images
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  )
}
