"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import type { Campaign, Theme, Post } from "../campaign-workflow"
import { CheckCircle, Share2, Calendar, ListOrdered } from "lucide-react"
import { schedulePosts } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"

interface CompletionStepProps {
  campaign: Campaign
  theme: Theme
  posts: Post[]
  onScheduleComplete: () => void
  onBack: () => void
}

export default function CompletionStep({ campaign, theme, posts, onScheduleComplete, onBack }: CompletionStepProps) {
  const [isScheduled, setIsScheduled] = useState(false)
  const [showScheduleAnimation, setShowScheduleAnimation] = useState(false)
  const { toast } = useToast()

  const handleSchedulePosts = async () => {
    setShowScheduleAnimation(true)

    try {
      // Filter posts with numeric IDs (from the database)
      const postIds = posts.filter((post) => typeof post.id === "number").map((post) => post.id as number)

      if (postIds.length > 0) {
        const result = await schedulePosts(postIds)

        if (!result.success) {
          toast({
            title: "Error",
            description: result.error || "Failed to schedule posts",
            variant: "destructive",
          })
          setShowScheduleAnimation(false)
          return
        }
      }

      // Simulate scheduling process
      setTimeout(() => {
        setIsScheduled(true)
        setShowScheduleAnimation(false)
        toast({
          title: "Posts scheduled",
          description: `${posts.length} posts have been scheduled successfully.`,
        })
        onScheduleComplete()
      }, 1500)
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      setShowScheduleAnimation(false)
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
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-black mb-4 ${isScheduled ? "bg-green-400" : "bg-yellow-300"}`}
        >
          {showScheduleAnimation ? (
            <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div>
          ) : (
            <CheckCircle size={32} className="text-black" />
          )}
        </div>
        <h2 className="text-3xl font-black mb-2">{isScheduled ? "Campaign Ready!" : "Plan to post!"}</h2>
        <p className="text-gray-700">
          {isScheduled
            ? "Your campaign has been scheduled and is ready to be shared"
            : "Your campaign has been created and is ready to be scheduled"}
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
              {isScheduled ? "Scheduled Posts" : "Posts with Generated Images"} ({posts.length})
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
                      {isScheduled && (
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
        {!isScheduled && (
          <>
            <button
              onClick={onBack}
              className="py-3 px-6 bg-white border-4 border-black rounded-md font-bold text-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Back to Images
            </button>

            <button
              onClick={handleSchedulePosts}
              disabled={showScheduleAnimation}
              className="py-3 px-6 bg-yellow-300 border-4 border-black rounded-md font-bold text-lg hover:bg-yellow-400 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 disabled:opacity-70"
            >
              {showScheduleAnimation ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar size={20} />
                  Schedule Posts
                </>
              )}
            </button>
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
