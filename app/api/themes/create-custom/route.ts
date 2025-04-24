import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { themes } from "@/lib/schema"
import { eq, ne, and } from "drizzle-orm"

export async function POST(request: Request) {
  try {
    const themeData = await request.json()

    if (!themeData.campaignId) {
      return NextResponse.json({ success: false, error: "Campaign ID is required" }, { status: 400 })
    }

    // Insert the theme into the database
    const [insertedTheme] = await db
      .insert(themes)
      .values({
        campaignId: themeData.campaignId,
        title: themeData.title,
        story: themeData.story,
        isSelected: themeData.isSelected || false,
        status: themeData.status || "pending",
        post_status: themeData.post_status || "pending",
      })
      .returning()

    // If this theme is selected, update other themes to be not selected
    if (themeData.isSelected) {
      await db
        .update(themes)
        .set({ isSelected: false })
        .where(and(eq(themes.campaignId, themeData.campaignId), ne(themes.id, insertedTheme.id)))
    }

    return NextResponse.json({
      success: true,
      data: insertedTheme,
    })
  } catch (error) {
    console.error("Error creating custom theme:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create custom theme: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}
