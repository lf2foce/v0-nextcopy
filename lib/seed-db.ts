import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import { campaigns, themes, contentPosts } from "./schema"
import { sql } from "drizzle-orm"

/**
 * This script seeds the database with sample data for development and testing.
 * It can be run independently or as part of the reset-db process.
 */
export async function seedDatabase(forceSeeding = false) {
  console.log("Starting database seeding process...")

  // Create a Neon client
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set")
    throw new Error("DATABASE_URL environment variable is not set")
  }

  console.log("Connecting to database for seeding...")

  try {
    const client = neon(connectionString)
    const db = drizzle(client)

    // Test connection
    console.log("Testing database connection...")
    const testResult = await db.execute(sql`SELECT 1 as test`)
    console.log("Connection test result:", testResult)

    // Check if database already has data
    if (!forceSeeding) {
      console.log("Checking if database already has data...")
      const existingCampaigns = await db.select({ count: sql`count(*)` }).from(campaigns)
      const campaignCount = Number(existingCampaigns[0].count)

      if (campaignCount > 0) {
        console.log(`Database already has ${campaignCount} campaigns. Skipping seeding.`)
        console.log("If you want to reset and reseed, use the reset-db script instead.")
        return { success: true, skipped: true }
      }
    } else {
      console.log("Force seeding enabled, proceeding regardless of existing data...")
    }

    console.log("Seeding campaigns...")
    // Insert sample campaigns with Vietnamese content
    const insertedCampaigns = await db
      .insert(campaigns)
      .values([
        {
          title: "Bộ Sưu Tập Mùa Hè 2025",
          description: "Quảng bá dòng thời trang mùa hè mới với màu sắc rực rỡ và vải nhẹ.",
          targetCustomer: "Người yêu thời trang từ 18-35 tuổi",
          insight: "Xu hướng thời trang mùa hè cho thấy sự ưa chuộng vải bền vững",
          repeatEveryDays: 7,
          status: "draft",
          currentStep: 0,
          startDate: new Date("2025-05-01"),
          isActive: true,
        },
        {
          title: "Chiến Dịch Trở Lại Trường Học",
          description: "Nhắm vào học sinh và phụ huynh cho mùa tựu trường với các ưu đãi đặc biệt.",
          targetCustomer: "Học sinh và phụ huynh",
          insight: "Phụ huynh bắt đầu mua sắm đồ dùng học tập 3 tuần trước khi nhập học",
          repeatEveryDays: 3,
          status: "draft",
          currentStep: 0,
          startDate: new Date("2025-08-01"),
          isActive: true,
        },
        {
          title: "Khuyến Mãi Lễ Hội",
          description: "Chương trình khuyến mãi mùa đông với ý tưởng quà tặng cho cả gia đình.",
          targetCustomer: "Người mua sắm quà tặng",
          insight: "Người mua sắm lễ hội bắt đầu tìm kiếm quà từ tháng 10",
          repeatEveryDays: 5,
          status: "draft",
          currentStep: 0,
          startDate: new Date("2025-11-15"),
          isActive: true,
        },
      ])
      .returning()

    console.log(`Inserted ${insertedCampaigns.length} sample campaigns`)

    // For the first campaign, add some themes
    if (insertedCampaigns.length > 0) {
      const campaignId = insertedCampaigns[0].id

      console.log(`Seeding themes for campaign ${campaignId}...`)
      const insertedThemes = await db
        .insert(themes)
        .values([
          {
            campaignId,
            title: "Táo Bạo & Rực Rỡ",
            story: "Màu sắc tương phản cao với kiểu chữ đậm để tạo ấn tượng tối đa",
            isSelected: true,
            status: "selected",
            post_status: "ready",
          },
          {
            campaignId,
            title: "Tối Giản",
            story: "Thiết kế đơn giản, gọn gàng với nhiều khoảng trắng",
            isSelected: false,
            status: "pending",
            post_status: "pending",
          },
          {
            campaignId,
            title: "Sóng Hoài Cổ",
            story: "Lấy cảm hứng từ màu neon và họa tiết hình học của thập niên 80",
            isSelected: false,
            status: "pending",
            post_status: "pending",
          },
        ])
        .returning()

      console.log(`Inserted ${insertedThemes.length} sample themes`)

      // Add some posts for the selected theme
      if (insertedThemes.length > 0) {
        const selectedTheme = insertedThemes.find((theme) => theme.isSelected)
        if (selectedTheme) {
          console.log(`Seeding content posts for theme ${selectedTheme.id}...`)

          // Function to generate sample images JSON
          const generateImagesJson = (postId: number) => {
            const sampleImageUrls = [
              "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=600&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1527090526205-beaac8dc3c62?q=80&w=600&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1520004435696-29a0d044efab?q=80&w=600&auto=format&fit=crop",
            ]
            const imageStyles = ["vibrant", "minimalist", "retro", "futuristic"]

            const images = []
            for (let i = 0; i < 4; i++) {
              const randomImageIndex = Math.floor(Math.random() * sampleImageUrls.length)
              const randomStyleIndex = Math.floor(Math.random() * imageStyles.length)

              images.push({
                url: sampleImageUrls[randomImageIndex],
                prompt: `Generated image ${i + 1} for post ${postId}`,
                order: i,
                isDefault: i === 0,
                metadata: {
                  width: 1024,
                  height: 1024,
                  style: imageStyles[randomStyleIndex],
                },
              })
            }
            return JSON.stringify({ images })
          }

          // Log the generated JSON for debugging
          const sampleJson = generateImagesJson(999)
          console.log("Sample images JSON structure:", sampleJson)

          const insertedPosts = await db
            .insert(contentPosts)
            .values([
              {
                campaignId,
                themeId: selectedTheme.id,
                title: "Cảm Hứng Mùa Hè",
                content:
                  "Giới thiệu bộ sưu tập mùa hè của chúng tôi! Hoàn hảo cho những ngày nắng nóng và đêm mát mẻ. #MùaHèSôiĐộng",
                imageUrl:
                  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
                status: "approved",
                scheduledDate: new Date("2025-05-15"),
                images: generateImagesJson(1),
                defaultImageIndex: 0,
              },
              {
                campaignId,
                themeId: selectedTheme.id,
                title: "Khuyến Mãi Mùa Hè",
                content:
                  "Đánh bại cái nóng với các sản phẩm thiết yếu mùa hè mới của chúng tôi. Ưu đãi có thời hạn - mua ngay! #KhuyếnMãiHè",
                imageUrl:
                  "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=600&auto=format&fit=crop",
                status: "scheduled",
                scheduledDate: new Date("2025-05-20"),
                images: generateImagesJson(2),
                defaultImageIndex: 0,
              },
              {
                campaignId,
                themeId: selectedTheme.id,
                title: "Bộ Sưu Tập Mùa Hè",
                content:
                  "Mùa hè đang gọi! Khám phá bộ sưu tập mới của chúng tôi được thiết kế cho những ngày hè hoàn hảo của bạn.",
                imageUrl:
                  "https://images.unsplash.com/photo-1527090526205-beaac8dc3c62?q=80&w=600&auto=format&fit=crop",
                status: "approved",
                scheduledDate: new Date("2025-05-25"),
                images: generateImagesJson(3),
                defaultImageIndex: 0,
              },
            ])
            .returning()

          console.log(`Inserted ${insertedPosts.length} sample content posts`)

          // Verify the inserted posts have the images field
          for (const post of insertedPosts) {
            console.log(`Post ${post.id} images field:`, post.images ? "Present" : "Missing")
          }
        }
      }
    }

    console.log("✅ Database seeded successfully!")
    return { success: true }
  } catch (error) {
    console.error("❌ Error seeding database:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      details: error instanceof Error ? error.stack : undefined,
    }
  }
}
