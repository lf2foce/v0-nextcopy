"use client"

import { useState, useEffect } from "react"
import type { Campaign, Theme } from "@/types"
import { Loader2, RefreshCw } from "lucide-react"
import { generateThemes, selectTheme } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface GenerateSelectThemeProps {
  campaign: Campaign
  onThemeSelected: (theme: Theme) => void
  onBack: () => void
}

export default function GenerateSelectTheme({ campaign, onThemeSelected, onBack }: GenerateSelectThemeProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSelecting, setIsSelecting] = useState(false)
  const [themes, setThemes] = useState<Theme[]>([])
  const [selectedThemeId, setSelectedThemeId] = useState<string | number | null>(null)
  const { toast } = useToast()

  // Generate and save themes when component mounts
  useEffect(() => {
    if (campaign && campaign.id) {
      generateAndSaveThemes()
    }
  }, [campaign])

  // Function to generate and save themes
  const generateAndSaveThemes = async () => {
    if (!campaign.id) {
      toast({
        title: "Error",
        description: "Campaign ID is missing. Please try again.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSelectedThemeId(null) // Reset selection when regenerating

    try {
      // Call the server action to generate themes from the external API
      const result = await generateThemes(campaign.id)

      if (result.success) {
        console.log("Themes generated successfully. Count:", result.data.length)
        // Completely replace existing themes
        setThemes(result.data)

        // Check for warnings in any custom property of the result
        if (typeof result === 'object' && 'warning' in result && result.warning) {
          toast({
            title: "Warning",
            description: result.warning as string,
          })
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate themes",
          variant: "destructive",
        })
        // Set empty themes array if API fails
        setThemes([])
      }
    } catch (error) {
      console.error("Theme generation error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      // Set empty themes array if there's an error
      setThemes([])
    } finally {
      setIsLoading(false)
    }
  }

  // Function to refresh themes - completely replace existing themes
  const handleRefreshThemes = async () => {
    setThemes([]) // Clear existing themes first
    await generateAndSaveThemes()
    toast({
      title: "Themes refreshed",
      description: "New theme options have been generated.",
    })
  }

  // Function to handle theme selection
  const handleThemeSelection = async (themeId: string | number) => {
    setSelectedThemeId(themeId)
  }

  // Function to handle theme selection and start polling
  const handleContinue = async () => {
    if (!selectedThemeId) {
      toast({
        title: "No theme selected",
        description: "Please select a theme to continue.",
        variant: "destructive",
      })
      return
    }

    const selectedTheme = themes.find((theme) => theme.id === selectedThemeId)
    if (!selectedTheme) {
      toast({
        title: "Error",
        description: "Selected theme not found",
        variant: "destructive",
      })
      return
    }

    setIsSelecting(true)

    try {
      // Only call selectTheme if the theme has a numeric ID (saved in database)
      if (typeof selectedTheme.id === "number") {
        console.log(`Selecting theme with ID ${selectedTheme.id}...`)
        const result = await selectTheme(selectedTheme.id)

        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to select theme",
            variant: "destructive",
          })
          setIsSelecting(false)
          return
        }
        
        // Ensure the theme data is correctly marked as selected in the database
        console.log("Theme selected successfully in database")
        
        // Wait a moment to ensure database operations complete
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Prepare a clean theme object with required properties to avoid issues in the next step
      const themeForNextStep: Theme = {
        ...selectedTheme,
        id: selectedTheme.id,
        isSelected: true,
        title: selectedTheme.title || selectedTheme.name || "Selected Theme",
        name: selectedTheme.name || selectedTheme.title || "Selected Theme"
      }
      
      console.log("Moving to content step with theme:", themeForNextStep)
      
      // Pass the enhanced theme object to the parent component to move to next step
      onThemeSelected(themeForNextStep)
    } catch (error) {
      console.error("Theme selection error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      setIsSelecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Select a Theme</h2>
        <p className="text-gray-700">Choose the theme that best fits your campaign vision</p>
      </div>

      <div className="bg-purple-50 border-4 border-black rounded-md p-4 mb-6">
        <h3 className="font-bold text-lg mb-2">Campaign Details</h3>
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
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center">
            <Loader2 size={40} className="animate-spin text-black mb-4" />
            <p className="text-lg font-medium">Generating themes...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={handleRefreshThemes}
              disabled={isSelecting}
              className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Generate New Themes
            </button>
          </div>

          <div className="space-y-4">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`border-4 ${selectedThemeId === theme.id ? "border-yellow-400 bg-yellow-50" : "border-black"} rounded-md p-4 cursor-pointer transition-all`}
                onClick={() => !isSelecting && handleThemeSelection(theme.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <input
                      type="radio"
                      title={`Select ${theme.title || theme.name} theme`}
                      checked={selectedThemeId === theme.id}
                      onChange={() => handleThemeSelection(theme.id)}
                      className="w-4 h-4"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{theme.title || theme.name}</h3>
                    <p className="text-gray-700 mb-2">{theme.story || theme.description}</p>

                    {theme.tags && (
                      <div className="flex flex-wrap gap-2">
                        {theme.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="py-1 px-3 bg-blue-100 border-2 border-blue-300 rounded-md text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onBack}
              disabled={isSelecting}
              className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
            >
              Back
            </button>

            <button
              onClick={handleContinue}
              disabled={!selectedThemeId || isSelecting}
              className="flex-1 py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
            >
              {isSelecting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Processing...
                </span>
              ) : (
                "Select Content"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
