"use client"

import { useState } from "react"
import CreateCampaign from "../steps/create-campaign"
import GenerateSelectTheme from "../steps/generate-select-theme"
import GenerateApproveContent from "../steps/generate-approve-content"
import GenerateImages from "../steps/generate-images"
import GenerateVideo from "../steps/generate-video"
import ReviewPosts from "../steps/review-posts"
import CompletionStep from "../steps/completion-step"

import type { Campaign, Theme, Post } from "../campaign-workflow"

interface CampaignWorkflowProps {
  initialCampaign?: Campaign
  initialStep?: number
  initialData?: {
    campaign?: Campaign
    themes?: Theme[]
    selectedTheme?: Theme
    posts?: Post[]
    selectedPosts?: Post[]
    postsWithImages?: Post[]
    postsWithVideos?: Post[]
  }
}

export default function CampaignWorkflow({ initialCampaign, initialStep = 0, initialData }: CampaignWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [postsWithImages, setPostsWithImages] = useState<Post[] | undefined>(initialData?.postsWithImages)

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  return (
    <div>
      {currentStep === 0 && (
        <CreateCampaign
          onSubmit={(campaignData) => {
            console.log("Campaign created:", campaignData)
            setCurrentStep(1)
          }}
          initialData={initialCampaign}
        />
      )}
      {currentStep === 1 && (
        <GenerateSelectTheme
          campaign={initialCampaign}
          onThemeSelected={(theme) => {
            console.log("Theme selected:", theme)
            setCurrentStep(2)
          }}
          onBack={() => setCurrentStep(0)}
        />
      )}
      {currentStep === 2 && (
        <GenerateApproveContent
          campaign={initialCampaign}
          theme={{ id: "1", name: "Theme 1", description: "Theme Description" }}
          onApprove={(posts) => {
            console.log("Posts approved:", posts)
            setCurrentStep(3)
          }}
          onBack={() => setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
        <GenerateImages
          posts={[]}
          onComplete={(newPostsWithImages) => {
            console.log("Images generated:", newPostsWithImages)
            setPostsWithImages(newPostsWithImages)
            setCurrentStep(4)
          }}
          onBack={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 4 && (!postsWithImages || postsWithImages.length === 0) && (
        <div className="text-center p-8">
          <p className="text-lg font-bold text-yellow-600">No posts with images available</p>
          <p className="text-gray-600 mt-2">
            You can continue without generating videos, or go back to add images first.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <button onClick={prevStep} className="py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium">
              Go Back to Images
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="py-2 px-4 bg-green-400 border-2 border-black rounded-md font-medium"
            >
              Skip to Review
            </button>
          </div>
        </div>
      )}
      {currentStep === 4 && (
        <GenerateVideo
          posts={initialData?.posts || []}
          onComplete={(postsWithVideos) => {
            console.log("Videos generated:", postsWithVideos)
            setCurrentStep(5)
          }}
          onBack={() => setCurrentStep(3)}
        />
      )}
      {currentStep === 5 && (
        <ReviewPosts
          posts={[]}
          onComplete={(reviewedPosts) => {
            console.log("Posts reviewed:", reviewedPosts)
            setCurrentStep(6)
          }}
          onBack={() => setCurrentStep(4)}
        />
      )}
      {currentStep === 6 && (
        <CompletionStep
          campaign={initialCampaign}
          theme={{ id: "1", name: "Theme 1", description: "Theme Description" }}
          posts={[]}
          onScheduleComplete={() => {
            console.log("Scheduling complete")
          }}
          onBack={() => setCurrentStep(5)}
        />
      )}
    </div>
  )
}
