import { pgTable, serial, text, timestamp, integer, boolean, pgEnum, date, jsonb } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Define enums
export const themeStatusEnum = pgEnum("theme_status", ["pending", "selected", "discarded"])
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "active", "archived"])
// Users table
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  name: text("name"),
  email: text("email").unique().notNull(),
  email_verified: boolean("email_verified").default(false),
  image_url: text("image_url"),
  role: text("role").default("user"),
  preferences: jsonb("preferences").default({}),
  last_login_at: timestamp("last_login_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
})

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  repeatEveryDays: integer("repeat_every_days").notNull(),
  targetCustomer: text("target_customer"),
  insight: text("insight"),
  description: text("description"),
  status: campaignStatusEnum("status").default("draft"),
  currentStep: integer("current_step").default(0).notNull(), // Keep currentStep for tracking progress
  startDate: date("start_date"),
  lastRunDate: date("last_run_date"),
  nextRunDate: date("next_run_date"),
  isActive: boolean("is_active").default(true),
  campaignData: text("campaign_data"), // Column to store campaign system prompt data as JSON text
})

// Themes table
export const themes = pgTable("themes", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .references(() => campaigns.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  story: text("story"),
  isSelected: boolean("is_selected").default(false),
  status: themeStatusEnum("status").default("pending"),
  post_status: text("post_status"), // Added post_status field
  content_plan: text("content_plan"), // Thêm trường content_plan để lưu trữ kế hoạch bài viết
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Content Posts table
export const contentPosts = pgTable("content_posts", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .references(() => campaigns.id, { onDelete: "cascade" })
    .notNull(),
  themeId: integer("theme_id")
    .references(() => themes.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title"),
  content: text("content"),
  status: text("status").default("approved"), // Changed from enum to text
  createdAt: timestamp("created_at").defaultNow().notNull(),
  scheduledDate: date("scheduled_date"),
  postedAt: timestamp("posted_at"),
  feedback: text("feedback"),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"), // Added video_url field
  images: text("images"), // This will store JSON string of multiple images
  defaultImageIndex: integer("default_image_index").default(0), // Index of the default image
  image_status: text("image_status").default("pending"), // Add image_status field with default "pending"
  post_metadata: text("post_metadata"), // Thêm trường post_metadata để lưu trữ metadata của bài đăng
})

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
}))

export const campaignsRelations = relations(campaigns, ({ many, one }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  themes: many(themes),
  contentPosts: many(contentPosts),
}))

export const themesRelations = relations(themes, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [themes.campaignId],
    references: [campaigns.id],
  }),
  contentPosts: many(contentPosts),
}))

export const contentPostsRelations = relations(contentPosts, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [contentPosts.campaignId],
    references: [campaigns.id],
  }),
  theme: one(themes, {
    fields: [contentPosts.themeId],
    references: [themes.id],
  }),
}))

// Types for inference
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert

export type Theme = typeof themes.$inferSelect
export type NewTheme = typeof themes.$inferInsert

export type ContentPost = typeof contentPosts.$inferSelect
export type NewContentPost = typeof contentPosts.$inferInsert

// Thêm type cho post_metadata
export interface PostMetadata {
  goals?: string
  content_type?: string
  content_ideas?: string
  content_length?: number
  [key: string]: any // Cho phép các trường khác
}
