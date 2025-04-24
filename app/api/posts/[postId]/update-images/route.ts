import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { contentPosts } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function POST(request: NextRequest, { params }: { params: { postId: string } }) {
  try {
    const postId = params.postId

    if (!postId) {
      return NextResponse.json({ success: false, error: "Post ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const { image, imagesJson } = body

    if (!image && !imagesJson) {
      return NextResponse.json(
        { success: false, error: "Either image or imagesJson must be provided" },
        { status: 400 },
      )
    }

    // Update the post in the database
    const updateData: any = {
      // Always set image_status to completed when manually updating images
      image_status: "completed",
    }

    if (image) updateData.imageUrl = image
    if (imagesJson) updateData.images = imagesJson

    await db
      .update(contentPosts)
      .set(updateData)
      .where(eq(contentPosts.id, Number.parseInt(postId)))

    return NextResponse.json({
      success: true,
      message: "Post images updated successfully",
    })
  } catch (error) {
    console.error("Error updating post images:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update post images",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
