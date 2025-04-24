"use client"

import { useState, useEffect } from "react"
import type { Campaign, Theme } from "../campaign-workflow"
import { Loader2 } from "lucide-react"
import { generateThemes } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface GenerateThemeProps {
  campaign: Campaign
  onGenerate: (themes: Theme[]) => void
  onBack: () => void
}

// Remove the theme ideas array - we don't want fallbacks anymore
// Removing: const themeIdeas = [...]

// Remove the generateRandomThemes function - no more fallbacks
// Removing: const generateRandomThemes = (campaign: Campaign, count = 4): Theme[] => {...}

export default function GenerateTheme({ campaign, onGenerate, onBack }: GenerateThemeProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  // Remove mockThemes state since we're not using fallbacks anymore
  // const [mockThemes, setMockThemes] = useState<Theme[]>([])
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

  // Remove the effect that generates initial mock themes
  // Removing: useEffect(() => { if (campaign && campaign.id) { setMockThemes(generateRandomThemes(campaign)) } }, [campaign])

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
      // Remove the mock themes logic and directly call the API
      // Removing: const themesWithCampaignId = mockThemes.map((theme) => ({...theme, campaignId: campaign.id}))

      // Call the API directly without any fallback data
      const result = await generateThemes(campaign.id)

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

  // Remove the handleRefreshThemes function since we're not using mock themes
  // Removing: const handleRefreshThemes = () => {...}

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

      {/* Remove the theme preview section since we're not using mock themes */}
      {/* Removing: <div className="space-y-4">...</div> */}

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
