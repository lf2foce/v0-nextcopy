"use client"

import { useState, useEffect } from "react"
import type { Campaign, Theme } from "../campaign-workflow"
import { Loader2, RefreshCw } from "lucide-react"
import { generateThemes } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface GenerateThemeProps {
  campaign: Campaign
  onGenerate: (themes: Theme[]) => void
  onBack: () => void
}

// Theme ideas for different types of campaigns
const themeIdeas = [
  {
    name: "Bold & Vibrant",
    description: "High contrast colors with bold typography for maximum impact",
  },
  {
    name: "Minimalist",
    description: "Clean, simple designs with plenty of white space",
  },
  {
    name: "Retro Wave",
    description: "80s inspired neon colors and geometric patterns",
  },
  {
    name: "Nature Inspired",
    description: "Organic shapes and earthy color palette",
  },
  {
    name: "Elegant & Sophisticated",
    description: "Refined aesthetics with luxury appeal and subtle details",
  },
  {
    name: "Playful & Fun",
    description: "Whimsical elements with bright colors and casual typography",
  },
  {
    name: "Tech & Modern",
    description: "Sleek, futuristic design with cutting-edge aesthetics",
  },
  {
    name: "Vintage Charm",
    description: "Classic elements with a nostalgic feel and timeless appeal",
  },
  {
    name: "Urban Street",
    description: "Gritty textures with bold graphics and contemporary edge",
  },
  {
    name: "Handcrafted",
    description: "Artisanal feel with hand-drawn elements and organic textures",
  },
]

// Function to generate random themes based on campaign details
const generateRandomThemes = (campaign: Campaign, count = 4): Theme[] => {
  // Shuffle the theme ideas array
  const shuffled = [...themeIdeas].sort(() => 0.5 - Math.random())

  // Take the first 'count' items
  const selectedThemes = shuffled.slice(0, count)

  // Map to Theme type with campaign ID
  return selectedThemes.map((theme, index) => ({
    id: `mock-${Date.now()}-${index}`,
    name: theme.name,
    description: theme.description,
    campaignId: campaign.id,
  }))
}

export default function GenerateTheme({ campaign, onGenerate, onBack }: GenerateThemeProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [mockThemes, setMockThemes] = useState<Theme[]>([])
  const { toast } = useToast()

  // Add fallback for missing campaign ID
  useEffect(() => {
    if (!campaign || !campaign.id) {
      console.error("Campaign or campaign ID is missing in GenerateTheme")
      toast({
        title: "Error",
        description: "Campaign information is incomplete. Please try again.",
        variant: "destructive",
      })
    }
  }, [campaign, toast])

  // Generate initial mock themes when component mounts
  useEffect(() => {
    if (campaign && campaign.id) {
      setMockThemes(generateRandomThemes(campaign))
    }
  }, [campaign])

  const handleGenerate = async () => {
    console.log("Campaign received in GenerateTheme:", campaign)

    if (!campaign.id) {
      console.error("Campaign ID is missing in GenerateTheme")
      toast({
        title: "Error",
        description: "Campaign ID is missing. Please try again.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Use the mock themes we've generated
      const themesWithCampaignId = mockThemes.map((theme) => ({
        ...theme,
        campaignId: campaign.id,
      }))

      const result = await generateThemes(campaign.id, themesWithCampaignId)

      if (result.success) {
        toast({
          title: "Themes generated",
          description: "Your themes have been generated successfully.",
        })
        onGenerate(result.data)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate themes",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Theme generation error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Function to generate new mock themes
  const handleRefreshThemes = () => {
    if (campaign && campaign.id) {
      const newThemes = generateRandomThemes(campaign)
      setMockThemes(newThemes)
      toast({
        title: "New themes generated",
        description: "Choose from these new theme options.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Generate Campaign Themes</h2>
        <p className="text-gray-700">We'll create theme options based on your campaign details</p>
      </div>

      <div className="bg-gray-100 border-4 border-black rounded-md p-4">
        <h3 className="font-bold text-lg mb-2">Campaign Summary</h3>
        <div className="space-y-2">
          <p>
            <span className="font-bold">Name:</span> {campaign.name || campaign.title}
          </p>
          <p>
            <span className="font-bold">Description:</span> {campaign.description}
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
            <span className="font-bold">Generation Mode:</span>{" "}
            {campaign.generationMode === "pre-batch" ? "Pre-batch" : "Just-in-time"}
          </p>
          <p>
            <span className="font-bold">Repeat Every:</span> {campaign.repeatEveryDays} days
          </p>
          <p>
            <span className="font-bold">Start Date:</span>{" "}
            {campaign.startDate instanceof Date
              ? campaign.startDate.toLocaleDateString()
              : new Date(campaign.startDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Preview of themes that will be generated */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Theme Preview</h3>
          <button
            onClick={handleRefreshThemes}
            className="flex items-center gap-2 py-2 px-4 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300"
          >
            <RefreshCw size={16} />
            Generate New Options
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockThemes.map((theme, index) => (
            <div key={index} className="border-2 border-black rounded-md p-4 bg-white">
              <h4 className="font-bold">{theme.name}</h4>
              <p className="text-gray-700">{theme.description}</p>
            </div>
          ))}
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
              Generating Themes...
            </span>
          ) : (
            "Generate Themes"
          )}
        </button>
      </div>
    </div>
  )
}
