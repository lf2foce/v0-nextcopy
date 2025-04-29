"use client"

import { useState, useEffect } from "react"
import type { Campaign, Theme } from "../campaign-workflow"
import { Loader2, RefreshCw } from "lucide-react"
import { generateThemes, selectTheme } from "@/lib/actions_api"
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

  // Add a new state for custom theme at the top of the component with the other state declarations
  const [customTheme, setCustomTheme] = useState<Theme | null>(null)
  const [customThemeTitle, setCustomThemeTitle] = useState("")
  const [customThemeDescription, setCustomThemeDescription] = useState("")
  const [isEditingCustomTheme, setIsEditingCustomTheme] = useState(false)
  const [isSavingCustomTheme, setIsSavingCustomTheme] = useState(false)

  // Generate themes when component mounts
  useEffect(() => {
    if (campaign && campaign.id) {
      generateAndSaveThemes()
    }
  }, [campaign])

  // Function to generate themes
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
        setThemes(result.data)

        if (result.warning) {
          toast({
            title: "Warning",
            description: result.warning,
          })
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate themes",
          variant: "destructive",
        })
        setThemes([])
      }
    } catch (error) {
      console.error("Theme generation error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      setThemes([])
    } finally {
      setIsLoading(false)
    }
  }

  // Function to handle theme selection
  const handleThemeSelection = async (themeId: string | number) => {
    setSelectedThemeId(themeId)
  }

  // Function to safely parse content plan
  const parseContentPlan = (contentPlanData: any) => {
    if (!contentPlanData) return null

    // If it's already an object, return it
    if (typeof contentPlanData === "object") return contentPlanData

    // If it's a string, try to parse it
    if (typeof contentPlanData === "string") {
      try {
        return JSON.parse(contentPlanData)
      } catch (e) {
        console.error("Error parsing content plan:", e)
        return null
      }
    }

    return null
  }

  // Function to save custom theme to database
  const saveCustomThemeToDatabase = async (customTheme: Theme): Promise<Theme | null> => {
    if (!campaign.id) {
      toast({
        title: "Error",
        description: "Campaign ID is missing. Cannot save custom theme.",
        variant: "destructive",
      })
      return null
    }

    try {
      setIsSavingCustomTheme(true)

      // Prepare theme data for database
      const themeData = {
        campaignId: campaign.id,
        title: customTheme.title || "",
        story: customTheme.story || "",
        isSelected: true, // Mark as selected by default
        status: "selected",
        post_status: "pending", // Start with pending status
        content_plan: customTheme.content_plan || null, // Include content plan
      }

      // Use server action to save the theme
      const response = await fetch("/api/themes/create-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(themeData),
      })

      if (!response.ok) {
        throw new Error(`Failed to save custom theme: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to save custom theme")
      }

      // Return the saved theme with database ID
      return result.data
    } catch (error) {
      console.error("Error saving custom theme:", error)
      toast({
        title: "Error",
        description: "Failed to save custom theme: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      })
      return null
    } finally {
      setIsSavingCustomTheme(false)
    }
  }

  // Add this function to handle custom theme creation after the handleThemeSelection function
  const handleCreateCustomTheme = () => {
    if (!customThemeTitle.trim()) {
      toast({
        title: "Error",
        description: "Theme title is required",
        variant: "destructive",
      })
      return
    }

    // Create a basic content plan structure for the custom theme
    const basicContentPlan = {
      items: [
        {
          goal: "Giới thiệu thương hiệu và sản phẩm chính",
          title: "Giới thiệu về " + customThemeTitle,
          format: "Bài viết blog/social media",
          content_idea: "Giới thiệu tổng quan về thương hiệu, giá trị cốt lõi và sản phẩm chính",
        },
        {
          goal: "Xây dựng niềm tin với khách hàng",
          title: "Câu chuyện đằng sau " + customThemeTitle,
          format: "Video ngắn/bài viết",
          content_idea: "Chia sẻ câu chuyện, nguồn cảm hứng và quá trình phát triển thương hiệu",
        },
      ],
    }

    const newCustomTheme: Theme = {
      id: `custom-${Date.now()}`,
      title: customThemeTitle,
      story: customThemeDescription,
      campaignId: campaign.id,
      isSelected: false,
      status: "pending",
      content_plan: JSON.stringify(basicContentPlan),
    }

    setCustomTheme(newCustomTheme)
    setSelectedThemeId(newCustomTheme.id)
    setIsEditingCustomTheme(false)
  }

  // Add this function to toggle the custom theme editor
  const toggleCustomThemeEditor = () => {
    setIsEditingCustomTheme(!isEditingCustomTheme)
    if (!isEditingCustomTheme) {
      setSelectedThemeId(null)
    }
  }

  // Function to handle theme selection and continue
  const handleContinue = async () => {
    if (!selectedThemeId) {
      toast({
        title: "No theme selected",
        description: "Please select a theme to continue.",
        variant: "destructive",
      })
      return
    }

    setIsSelecting(true)

    try {
      // Check if we're using a custom theme
      if (selectedThemeId.toString().startsWith("custom-") && customTheme) {
        // For custom themes, we need to save it to the database first
        const savedCustomTheme = await saveCustomThemeToDatabase(customTheme)

        if (!savedCustomTheme) {
          setIsSelecting(false)
          return
        }

        // Now select the saved theme to trigger content generation
        if (typeof savedCustomTheme.id === "number") {
          const result = await selectTheme(savedCustomTheme.id)

          if (!result.success) {
            toast({
              title: "Error",
              description: result.error || "Failed to select custom theme",
              variant: "destructive",
            })
            setIsSelecting(false)
            return
          }

          toast({
            title: "Custom theme selected",
            description: `Theme "${savedCustomTheme.title}" has been selected.`,
          })

          // Move to the next step with the saved custom theme
          onThemeSelected(savedCustomTheme)
        } else {
          toast({
            title: "Error",
            description: "Failed to get proper ID for custom theme",
            variant: "destructive",
          })
          setIsSelecting(false)
        }
        return
      }

      // Original code for API-generated themes
      const selectedTheme = themes.find((theme) => theme.id === selectedThemeId)
      if (!selectedTheme) {
        toast({
          title: "Error",
          description: "Selected theme not found",
          variant: "destructive",
        })
        setIsSelecting(false)
        return
      }

      // Only call selectTheme if the theme has a numeric ID (saved in database)
      if (typeof selectedTheme.id === "number") {
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

        toast({
          title: "Theme selected",
          description: `Theme "${selectedTheme.title || selectedTheme.name}" has been selected.`,
        })
      }

      // Move to the next step
      onThemeSelected(selectedTheme)
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

  const allThemes = [...themes]

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
              onClick={generateAndSaveThemes}
              disabled={isSelecting}
              className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Generate New Themes
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allThemes.map((theme) => (
              <div
                key={theme.id}
                className={`border-4 ${selectedThemeId === theme.id ? "border-yellow-400 bg-yellow-50" : "border-black"} rounded-md p-4 cursor-pointer transition-all`}
                onClick={() => !isSelecting && handleThemeSelection(theme.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <input
                      type="radio"
                      checked={selectedThemeId === theme.id}
                      onChange={() => handleThemeSelection(theme.id)}
                      className="w-4 h-4"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{theme.title || theme.name}</h3>
                    <p className="text-gray-700 mb-2">{theme.story || theme.description}</p>

                    {/* Simplified Content Plan Section */}
                    {theme.content_plan && (
                      <div className="mt-4 border-t-2 border-black pt-3">
                        <h4 className="font-bold text-md mb-2">Kế hoạch bài viết:</h4>
                        <div className="space-y-2">
                          {(() => {
                            try {
                              const contentPlan = parseContentPlan(theme.content_plan)

                              if (contentPlan && contentPlan.items && Array.isArray(contentPlan.items)) {
                                return contentPlan.items.map((item, index) => (
                                  <div key={index} className="border border-gray-200 p-2 rounded-md bg-white">
                                    <p className="font-medium text-sm">{item.title}</p>
                                  </div>
                                ))
                              }
                              return <p className="text-sm italic">Không có kế hoạch bài viết chi tiết</p>
                            } catch (e) {
                              console.error("Error rendering content plan:", e, theme.content_plan)
                              return (
                                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                                  <p className="text-sm italic text-red-500">
                                    Không thể hiển thị kế hoạch bài viết do lỗi định dạng
                                  </p>
                                </div>
                              )
                            }
                          })()}
                        </div>
                      </div>
                    )}

                    {theme.tags && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {theme.tags.map((tag, index) => (
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

            {/* Custom Theme Option */}
            <div
              className={`border-4 ${selectedThemeId === customTheme?.id ? "border-yellow-400 bg-yellow-50" : "border-black"} rounded-md p-4 cursor-pointer transition-all ${isEditingCustomTheme ? "col-span-full" : ""}`}
              onClick={() =>
                !isSelecting && !isEditingCustomTheme && customTheme && handleThemeSelection(customTheme.id)
              }
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {!isEditingCustomTheme && (
                    <input
                      type="radio"
                      checked={customTheme && selectedThemeId === customTheme.id}
                      onChange={() => customTheme && handleThemeSelection(customTheme.id)}
                      className="w-4 h-4"
                      disabled={!customTheme}
                    />
                  )}
                </div>
                <div className="flex-1">
                  {isEditingCustomTheme ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="customThemeTitle" className="block font-bold mb-1">
                          Theme Title
                        </label>
                        <input
                          id="customThemeTitle"
                          type="text"
                          value={customThemeTitle}
                          onChange={(e) => setCustomThemeTitle(e.target.value)}
                          className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          placeholder="Enter your theme title"
                        />
                      </div>
                      <div>
                        <label htmlFor="customThemeDescription" className="block font-bold mb-1">
                          Theme Description
                        </label>
                        <textarea
                          id="customThemeDescription"
                          value={customThemeDescription}
                          onChange={(e) => setCustomThemeDescription(e.target.value)}
                          className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[100px]"
                          placeholder="Describe your theme"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCreateCustomTheme()
                          }}
                          className="py-2 px-4 bg-green-400 border-2 border-black rounded-md font-medium hover:bg-green-500"
                        >
                          Save Custom Theme
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsEditingCustomTheme(false)
                          }}
                          className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : customTheme ? (
                    <>
                      <h3 className="font-bold text-lg">{customTheme.title}</h3>
                      <p className="text-gray-700 mb-2">{customTheme.story}</p>

                      {/* Simplified Custom Theme Content Plan */}
                      {customTheme.content_plan && (
                        <div className="mt-4 border-t-2 border-black pt-3">
                          <h4 className="font-bold text-md mb-2">Kế hoạch bài viết:</h4>
                          <div className="space-y-2">
                            {(() => {
                              try {
                                const contentPlan = parseContentPlan(customTheme.content_plan)

                                if (contentPlan && contentPlan.items && Array.isArray(contentPlan.items)) {
                                  return contentPlan.items.map((item, index) => (
                                    <div key={index} className="border border-gray-200 p-2 rounded-md bg-white">
                                      <p className="font-medium text-sm">{item.title}</p>
                                    </div>
                                  ))
                                }
                                return <p className="text-sm italic">Không có kế hoạch bài viết chi tiết</p>
                              } catch (e) {
                                console.error("Error rendering custom content plan:", e)
                                return <p className="text-sm italic text-red-500">Lỗi hiển thị kế hoạch bài viết</p>
                              }
                            })()}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCustomThemeTitle(customTheme.title || "")
                            setCustomThemeDescription(customTheme.story || "")
                            setIsEditingCustomTheme(true)
                          }}
                          className="py-1 px-3 bg-blue-300 border-2 border-black rounded-md hover:bg-blue-400 text-sm"
                        >
                          Edit Custom Theme
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="font-bold text-lg">Create Your Own Theme</h3>
                      <p className="text-gray-700 mb-2">
                        Don't like the generated themes? Create your own custom theme.
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCustomThemeEditor()
                        }}
                        className="py-1 px-3 bg-purple-300 border-2 border-black rounded-md hover:bg-purple-400 text-sm"
                      >
                        Create Custom Theme
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
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
              disabled={!selectedThemeId || isSelecting || isSavingCustomTheme}
              className="flex-1 py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
            >
              {isSelecting || isSavingCustomTheme ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2" size={20} />
                  {isSavingCustomTheme ? "Saving Custom Theme..." : "Processing..."}
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
