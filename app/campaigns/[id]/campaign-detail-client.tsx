"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, PauseCircle, PlayCircle, Trash2, Clock, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { toggleCampaignActiveStatus } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import CampaignWorkflow from "@/components/workflow/campaign-workflow"

export default function CampaignDetailClient({ initialCampaign }: { initialCampaign: any }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<any>(initialCampaign)
  const [isPaused, setIsPaused] = useState(!initialCampaign.isActive) // If isActive is false, then it's paused
  const [isToggling, setIsToggling] = useState(false)
  const { toast } = useToast()

  const togglePauseStatus = async () => {
    if (isToggling) return

    setIsToggling(true)
    // If currently paused (isPaused=true), we want to activate (isActive=true)
    // If currently active (isPaused=false), we want to pause (isActive=false)
    const newActiveStatus = isPaused // If paused, set isActive to true; if not paused, set isActive to false

    try {
      const result = await toggleCampaignActiveStatus(campaign.id, newActiveStatus)

      if (result.success) {
        setIsPaused(!newActiveStatus) // Update UI state
        // Update the campaign object with the new status
        setCampaign({
          ...campaign,
          isActive: newActiveStatus,
        })

        toast({
          title: newActiveStatus ? "Campaign Activated" : "Campaign Paused",
          description: newActiveStatus
            ? "The campaign is now active and will run as scheduled."
            : "The campaign has been paused and will not run until activated.",
          variant: "success",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update campaign status",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error toggling campaign status:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
    }
  }

  // Format the date range
  const formatDateRange = () => {
    const startDate =
      campaign.startDate instanceof Date
        ? campaign.startDate.toLocaleDateString()
        : new Date(campaign.startDate).toLocaleDateString()

    // Calculate end date based on start date and repeatEveryDays
    const endDateObj = new Date(campaign.startDate)
    endDateObj.setDate(endDateObj.getDate() + campaign.repeatEveryDays)
    const endDate = endDateObj.toLocaleDateString()

    return `${startDate} - ${endDate}`
  }

  // Get the selected theme
  const selectedTheme = campaign.selectedTheme || {}

  // Get all posts except disapproved ones
  const postsWithContent = campaign.allPosts?.filter((post: any) => post.status !== "disapproved") || []

  // Calculate total posts count
  const totalPosts = postsWithContent.length

  // Calculate total themes
  const totalThemes = campaign.allThemes ? campaign.allThemes.length : 0

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-8">
        <Link
          href="/campaigns"
          className="flex items-center gap-1 py-2 px-4 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300"
        >
          <ArrowLeft size={16} />
          Back to Campaigns
        </Link>

        <h1 className="text-4xl font-black ml-4">{campaign.name || campaign.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Campaign Details and Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Details */}
          <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-4">Campaign Details</h2>
            <p className="text-lg mb-6">{campaign.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Clock size={20} className="shrink-0" />
                <div>
                  <span className="font-bold">Duration:</span> Everyday for {campaign.repeatEveryDays} days
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users size={20} className="shrink-0" />
                <div>
                  <span className="font-bold">Target Customer:</span> {campaign.targetCustomer || "Not specified"}
                </div>
              </div>

              <div className="flex items-center gap-2 md:col-span-2">
                <Calendar size={20} className="shrink-0" />
                <div>
                  <span className="font-bold">Timeline:</span> {formatDateRange()}
                </div>
              </div>
            </div>

            <button
              onClick={togglePauseStatus}
              disabled={isToggling}
              className={`flex items-center gap-2 py-3 px-6 rounded-md font-bold text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                isPaused ? "bg-green-500 hover:bg-[#16a34a]" : "bg-[#FFDD00] hover:bg-[#FFCC00]"
              } transition-colors`}
            >
              {isToggling ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                  Updating...
                </div>
              ) : isPaused ? (
                <>
                  <PlayCircle size={20} />
                  Activate Campaign
                </>
              ) : (
                <>
                  <PauseCircle size={20} />
                  Pause Campaign
                </>
              )}
            </button>
          </div>

          {/* Selected Theme */}
          <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-4">Selected Theme</h2>

            {selectedTheme && (selectedTheme.name || selectedTheme.title) ? (
              <div className="bg-yellow-100 border-4 border-black rounded-lg p-6 mb-4">
                <h3 className="text-xl font-bold mb-2">{selectedTheme.name || selectedTheme.title}</h3>
                <p className="mb-4">{selectedTheme.description || selectedTheme.story}</p>

                <div className="flex flex-wrap gap-2">
                  {selectedTheme.tags
                    ? selectedTheme.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="py-1 px-3 bg-blue-200 border-2 border-black rounded-md text-sm font-medium"
                        >
                          {tag}
                        </span>
                      ))
                    : // If no tags, create some from the theme description
                      selectedTheme.description
                        ?.split(" ")
                        .filter((word: string) => word.length > 5)
                        .slice(0, 4)
                        .map((word: string, index: number) => (
                          <span
                            key={index}
                            className="py-1 px-3 bg-blue-200 border-2 border-black rounded-md text-sm font-medium"
                          >
                            {word.toLowerCase().replace(/[^a-z0-9]/g, "")}
                          </span>
                        ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-100 border-4 border-black rounded-lg p-6 mb-4 text-center">
                <p className="text-gray-700">No theme has been selected for this campaign yet.</p>
              </div>
            )}
          </div>

          {/* Content Preview Section */}
          <div className="border-4 border-black rounded-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-white border-b-4 border-black">
              <h2 className="text-xl font-bold">Content Preview</h2>
              <Link
                href={`/campaigns/${campaign.id}/content`}
                className="py-2 px-4 bg-blue-400 border-2 border-black rounded-md hover:bg-blue-500 text-sm font-medium"
              >
                View All Content
              </Link>
            </div>
            <div className="bg-gray-50 p-4">
              {postsWithContent && postsWithContent.length > 0 ? (
                <div className="space-y-4">
                  {postsWithContent
                    .filter((post) => post.status !== "disapproved")
                    .map((post, index) => (
                      <div key={post.id} className="bg-white border-2 border-black rounded-md p-4">
                        <h3 className="font-bold text-lg mb-2">{post.title || `Post ${index + 1}`}</h3>
                        <p className="text-gray-700 line-clamp-3">{post.content}</p>
                        {post.status && (
                          <div className="mt-2">
                            <span
                              className={`inline-block px-2 py-1 text-xs rounded-md ${
                                post.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : post.status === "scheduled"
                                    ? "bg-blue-100 text-blue-800"
                                    : post.status === "published"
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No content available yet</p>
                </div>
              )}
            </div>
          </div>

          <CampaignWorkflow
            initialCampaign={campaign}
            initialStep={campaign.currentStep || 0}
            initialData={{
              campaign: campaign,
              themes: campaign.allThemes || [],
              selectedTheme: campaign.selectedTheme || null,
              posts: campaign.allPosts || [],
              selectedPosts: campaign.approvedPosts || [],
              postsWithImages: campaign.postsWithImages || [],
              postsWithVideos: campaign.postsWithVideos || [],
            }}
          />
        </div>

        {/* Right Column - Stats and Actions */}
        <div className="space-y-6">
          {/* Campaign Stats */}
          <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-4">Campaign Stats</h2>

            <div className="bg-green-100 border-4 border-black rounded-lg p-4 mb-4">
              <h3 className="font-bold mb-1">Total Posts</h3>
              <p className="text-4xl font-black">{totalPosts}</p>
            </div>

            <div className="bg-blue-100 border-4 border-black rounded-lg p-4 mb-4">
              <h3 className="font-bold mb-1">Generated Themes</h3>
              <p className="text-4xl font-black">{totalThemes}</p>
            </div>

            <div className="bg-purple-100 border-4 border-black rounded-lg p-4">
              <h3 className="font-bold mb-2">Campaign Progress</h3>
              <div className="w-full bg-purple-200 h-4 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-purple-500 h-full"
                  style={{ width: `${campaign.currentStep >= 7 ? 100 : (campaign.currentStep / 7) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm">
                {campaign.currentStep >= 7 ? "Content Generated" : `Step ${campaign.currentStep} of 7`}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>

            <div className="space-y-3">
              <button
                onClick={togglePauseStatus}
                disabled={isToggling}
                className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-md font-bold text-lg border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                  isPaused ? "bg-green-500 hover:bg-[#16a34a]" : "bg-[#FFDD00] hover:bg-[#FFCC00]"
                } transition-colors`}
              >
                {isToggling ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                    Updating...
                  </div>
                ) : isPaused ? (
                  <>
                    <PlayCircle size={20} />
                    Activate Campaign
                  </>
                ) : (
                  <>
                    <PauseCircle size={20} />
                    Pause Campaign
                  </>
                )}
              </button>

              <Link
                href={`/themes?campaignId=${campaign.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#FFDD00] border-4 border-black rounded-md font-bold text-lg hover:bg-[#FFCC00] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                View Themes
              </Link>

              <Link
                href={`/campaigns/${campaign.id}/content`}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#60a5fa] border-4 border-black rounded-md font-bold text-lg hover:bg-[#3b82f6] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                View Content
              </Link>

              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
                    // In a real app, you would call an API to delete the campaign
                    // For example: deleteCampaign(campaign.id).then(() => router.push('/campaigns'))
                    router.push("/campaigns")
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#f87171] border-4 border-black rounded-md font-bold text-lg hover:bg-[#ef4444] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <Trash2 size={20} />
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
