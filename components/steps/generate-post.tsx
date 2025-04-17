"use client"

import { useState } from "react"
import type { Campaign, Theme, Post } from "../campaign-workflow"
import { Loader2 } from "lucide-react"
import { generatePosts } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface GeneratePostProps {
  campaign: Campaign
  theme: Theme
  onGenerate: (posts: Post[]) => void
  onBack: () => void
}

// Function to generate posts based on theme and campaign
const generateThemeBasedPosts = (campaign: Campaign, theme: Theme): Post[] => {
  // Get theme name and description from either old or new schema fields
  const themeName = theme.title || theme.name || "Theme"
  const themeDescription = theme.story || theme.description || ""

  // Extract keywords from theme and campaign
  const themeKeywords = `${themeName} ${themeDescription}`
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .filter((word) => !["with", "and", "the", "for", "that", "this"].includes(word))

  const campaignKeywords =
    `${campaign.name || campaign.title || ""} ${campaign.description || ""} ${campaign.target || campaign.targetCustomer || ""}`
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !["with", "and", "the", "for", "that", "this"].includes(word))

  // Combine keywords and get unique ones
  const allKeywords = [...new Set([...themeKeywords, ...campaignKeywords])]

  // Select random keywords for hashtags
  const getRandomHashtags = () => {
    const shuffled = [...allKeywords].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 3)
    return selected.map((word) => `#${word.charAt(0).toUpperCase() + word.slice(1)}`).join(" ")
  }

  // Content templates based on theme
  const contentTemplates = [
    `Introducing our ${themeName} collection! ${themeDescription} ${getRandomHashtags()}`,
    `Experience the essence of ${themeName}. Perfect for those who appreciate ${themeDescription.split(" ").slice(0, 3).join(" ")}... ${getRandomHashtags()}`,
    `New arrival: ${themeName} series. ${themeDescription} ${getRandomHashtags()}`,
    `Discover the beauty of ${themeName}. ${getRandomHashtags()}`,
  ]

  // Generate 3 posts with unique content
  return contentTemplates.slice(0, 3).map((content, index) => ({
    id: `post-${Date.now()}-${index}`,
    content,
    image: "/placeholder.svg?height=400&width=400",
    themeId: theme.id,
    campaignId: campaign.id,
  }))
}

export default function GeneratePost({ campaign, theme, onGenerate, onBack }: GeneratePostProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const handleGenerate = async () => {
    if (!campaign.id || typeof theme.id !== "number") {
      toast({
        title: "Error",
        description: "Campaign or theme ID is missing",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Generate posts based on the selected theme
      const themePosts = generateThemeBasedPosts(campaign, theme)

      // Call the API to save the posts
      const result = await generatePosts(campaign.id, theme.id, themePosts)

      if (result.success) {
        toast({
          title: "Posts generated",
          description: "Your posts have been generated successfully.",
        })
        onGenerate(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate posts",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Format the start date
  const startDate =
    campaign.startDate instanceof Date
      ? campaign.startDate.toLocaleDateString()
      : new Date(campaign.startDate).toLocaleDateString()

  // Get theme name and description from either old or new schema fields
  const themeName = theme.title || theme.name || "Theme"
  const themeDescription = theme.story || theme.description || ""

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Generate Posts</h2>
        <p className="text-gray-700">We'll create post options based on your campaign and selected theme</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-100 border-4 border-black rounded-md p-4">
          <h3 className="font-bold text-lg mb-2">Campaign</h3>
          <p>
            <span className="font-bold">Name:</span> {campaign.name || campaign.title}
          </p>
          <p>
            <span className="font-bold">Target:</span> {campaign.target || campaign.targetCustomer}
          </p>
          {campaign.insight && (
            <p>
              <span className="font-bold">Insight:</span> {campaign.insight}
            </p>
          )}
          <p>
            <span className="font-bold">Start Date:</span> {startDate}
          </p>
        </div>

        <div className="border-4 border-black rounded-md p-4">
          <h3 className="font-bold text-lg mb-2">Selected Theme</h3>
          <p>
            <span className="font-bold">Name:</span> {themeName}
          </p>
          {themeDescription && (
            <p>
              <span className="font-bold">Description:</span> {themeDescription}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
          Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex-1 py-3 px-6 bg-yellow-300 border-4 border-black rounded-md font-bold text-lg hover:bg-yellow-400 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70 disabled:transform-none disabled:hover:bg-yellow-300"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2" size={20} />
              Generating Posts...
            </span>
          ) : (
            "Generate Posts"
          )}
        </button>
      </div>
    </div>
  )
}
