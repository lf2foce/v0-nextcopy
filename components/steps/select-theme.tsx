"use client"

import { useState } from "react"
import type { Theme } from "@/types"
import { selectTheme } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, Loader2 } from "lucide-react"

interface SelectThemeProps {
  themes: Theme[]
  onSelect: (theme: Theme) => void
  onBack: () => void
}

// Theme ideas for generating more options
const additionalThemeIdeas = [
  {
    name: "Seasonal Celebration",
    description: "Festive elements that capture the spirit of the current season",
  },
  {
    name: "Eco-Friendly",
    description: "Sustainable aesthetics with natural elements and earth tones",
  },
  {
    name: "Abstract Geometry",
    description: "Bold shapes and patterns with a contemporary artistic feel",
  },
  {
    name: "Luxury Premium",
    description: "High-end aesthetics with sophisticated details and rich textures",
  },
  {
    name: "Wellness & Mindfulness",
    description: "Calming visuals with soft colors and balanced compositions",
  },
  {
    name: "Cultural Fusion",
    description: "Diverse influences blended into a rich, multicultural aesthetic",
  },
  {
    name: "Storytelling Narrative",
    description: "Sequential visuals that unfold a compelling brand story",
  },
  {
    name: "Photographic Realism",
    description: "Authentic imagery with minimal editing for genuine connection",
  },
]

export default function SelectTheme({ themes, onSelect, onBack }: SelectThemeProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [isGeneratingMore, setIsGeneratingMore] = useState(false)
  const [allThemes, setAllThemes] = useState<Theme[]>(themes)
  const { toast } = useToast()

  const handleSelectTheme = async (theme: Theme) => {
    if (!theme.campaignId || typeof theme.id !== "number") {
      toast({
        title: "Error",
        description: "Theme or campaign ID is missing",
        variant: "destructive",
      })
      return
    }

    setIsSelecting(true)

    try {
      const result = await selectTheme(theme.id)

      if (result.success) {
        toast({
          title: "Theme selected",
          description: `Theme "${theme.title || theme.name}" has been selected.`,
        })
        onSelect(theme)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to select theme",
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
      setIsSelecting(false)
    }
  }

  // Function to generate more theme options
  const handleGenerateMoreThemes = () => {
    setIsGeneratingMore(true)

    // Get the campaign ID from the first theme
    const campaignId = themes.length > 0 ? themes[0].campaignId : undefined

    if (!campaignId) {
      toast({
        title: "Error",
        description: "Cannot generate more themes: Campaign ID is missing",
        variant: "destructive",
      })
      setIsGeneratingMore(false)
      return
    }

    // Simulate API call delay
    setTimeout(() => {
      try {
        // Shuffle the additional theme ideas
        const shuffled = [...additionalThemeIdeas].sort(() => 0.5 - Math.random())

        // Take 2-4 random themes
        const count = Math.floor(Math.random() * 3) + 2 // 2 to 4 themes
        const newThemeIdeas = shuffled.slice(0, count)

        // Create new theme objects
        const newThemes = newThemeIdeas.map((idea, index) => ({
          id: `new-${Date.now()}-${index}`,
          name: idea.name,
          description: idea.description,
          campaignId,
          // Add any other required properties
        }))

        // Add the new themes to the existing ones
        setAllThemes((prev) => [...prev, ...newThemes])

        toast({
          title: "More themes generated",
          description: `${newThemes.length} additional themes have been generated.`,
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to generate additional themes",
          variant: "destructive",
        })
      } finally {
        setIsGeneratingMore(false)
      }
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black mb-2">Select a Theme</h2>
          <p className="text-gray-700">Choose the theme that best fits your campaign vision</p>
        </div>
        <button
          onClick={handleGenerateMoreThemes}
          disabled={isGeneratingMore}
          className="py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium hover:bg-yellow-400 flex items-center gap-2 disabled:opacity-70"
        >
          {isGeneratingMore ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Generate More Options
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allThemes.map((theme) => (
          <div
            key={theme.id}
            onClick={() => !isSelecting && !isGeneratingMore && handleSelectTheme(theme)}
            className={`border-4 border-black rounded-md p-4 cursor-pointer hover:bg-gray-50 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
              isSelecting || isGeneratingMore ? "opacity-70" : ""
            }`}
          >
            <h3 className="font-bold text-lg">{theme.title || theme.name}</h3>
            <p className="text-gray-700">{theme.story || theme.description}</p>
          </div>
        ))}
      </div>

      <div className="flex">
        <button
          onClick={onBack}
          disabled={isSelecting || isGeneratingMore}
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
        >
          Back
        </button>
      </div>
    </div>
  )
}
