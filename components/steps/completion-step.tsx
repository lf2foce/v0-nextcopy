"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Campaign, Theme, Post } from "../campaign-workflow"
import { CheckCircle, Share2, Calendar, ListOrdered } from "lucide-react"
import { schedulePosts } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface CompletionStepProps {
  campaign: Campaign
  theme: Theme
  posts: Post[]
  onScheduleComplete: () => void
  onBack: () => void
}

export default function CompletionStep({ campaign, theme, posts, onScheduleComplete, onBack }: CompletionStepProps) {
  const [isScheduling, setIsScheduling] = useState(false)
  const { toast } = useToast()

  const handleSchedule = async () => {
    setIsScheduling(true)
    try {
      // Mock scheduling - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Update posts with scheduled status
      const updatedPosts = posts.map(post => ({
        ...post,
        status: "scheduled",
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      }))

      toast({
        title: "Campaign scheduled",
        description: "Your campaign has been scheduled successfully.",
      })

      onScheduleComplete()
    } catch (error) {
      console.error("Error scheduling campaign:", error)
      toast({
        title: "Error",
        description: "Failed to schedule campaign",
        variant: "destructive",
      })
    } finally {
      setIsScheduling(false)
    }
  }

  // Format the start date
  const startDate =
    campaign.startDate instanceof Date
      ? campaign.startDate.toLocaleDateString()
      : new Date(campaign.startDate).toLocaleDateString()

  // Get theme name from either old or new schema fields
  const themeName = theme.title || theme.name || "Theme"
  const themeStory = theme.story || theme.description || ""

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-black mb-4 ${isScheduling ? "bg-green-400" : "bg-yellow-300"}`}
        >
          {isScheduling ? (
            <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div>
          ) : (
            <CheckCircle size={32} className="text-black" />
          )}
        </div>
        <h2 className="text-3xl font-black mb-2">{isScheduling ? "Scheduling..." : "Schedule Campaign"}</h2>
        <p className="text-gray-700">
          {isScheduling
            ? "Your campaign is being scheduled"
            : "Review and schedule your campaign"}
        </p>
      </div>

      <div className="bg-white border-4 border-black rounded-md p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-xl font-bold mb-4">Campaign Summary</h3>

        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-lg">Campaign Details</h4>
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
            <p>
              <span className="font-bold">Repeat Every:</span> {campaign.repeatEveryDays} days
            </p>
          </div>

          <div>
            <h4 className="font-bold text-lg">Selected Theme</h4>
            <p>
              <span className="font-bold">Name:</span> {themeName}
            </p>
            {themeStory && (
              <p>
                <span className="font-bold">Story:</span> {themeStory}
              </p>
            )}
          </div>

          <div>
            <h4 className="font-bold text-lg">
              {isScheduling ? "Scheduled Posts" : "Posts with Generated Images"} ({posts.length})
            </h4>
            <div className="space-y-4 mt-2">
              {posts.map((post) => (
                <div key={post.id} className="border-2 border-black rounded-md p-4 bg-gray-50">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/3 relative h-48 md:h-auto">
                      <Image
                        src={post.image || post.imageUrl || "/placeholder.svg"}
                        alt="Post preview"
                        fill
                        className="object-cover rounded-md"
                      />
                      {isScheduling && (
                        <div className="absolute top-2 right-2 bg-green-400 rounded-full p-1 border-2 border-black">
                          <CheckCircle size={20} className="text-black" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg">{post.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {!isScheduling && (
          <>
            <Button
              onClick={onBack}
              variant="outline"
              disabled={isScheduling}
            >
              Back
            </Button>

            <Button
              onClick={handleSchedule}
              disabled={isScheduling}
            >
              {isScheduling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Campaign
                </>
              )}
            </Button>
          </>
        )}

        <Link
          href="/campaigns"
          className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2"
        >
          <ListOrdered size={20} />
          Go to Campaigns
        </Link>

        <button className="py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
          <Share2 size={20} />
          Share Campaign
        </button>
      </div>
    </div>
  )
}
