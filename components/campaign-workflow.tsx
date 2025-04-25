"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import CreateCampaign from "./steps/create-campaign"
import GenerateSelectTheme from "./steps/generate-select-theme"
import GenerateApproveContent from "./steps/generate-approve-content"
import GenerateVideo from "./steps/generate-video"
import ReviewPosts from "./steps/review-posts"
import CompletionStep from "./steps/completion-step"
import WorkflowProgress from "./workflow-progress"
import { useToast } from "@/hooks/use-toast"
import { updateCampaignStep, getCampaignSteps } from "@/lib/actions_api"
import GenerateMultipleImages from "./steps/generate-multiple-images"

// Update the Campaign type to match the new schema
export type Campaign = {
  id?: number
  name: string
  description: string
  target: string
  insight?: string
  repeatEveryDays: number
  startDate: Date
  currentStep?: number
  title?: string
  targetCustomer?: string
}

export type Theme = {
  id: string | number
  name?: string
  description?: string
  campaignId?: number
  isSelected?: boolean
  title?: string
  story?: string
  tags?: string[]
}

export type Post = {
  id: string | number
  content: string
  image?: string
  imageUrl?: string
  videoUrl?: string
  images?: string
  imageGenerated?: boolean
  videoGenerated?: boolean
  campaignId?: number
  themeId?: number
  isApproved?: boolean
  isScheduled?: boolean
  title?: string
  status?: string
}

// Updated steps - added Video step between Images and Review
const steps = ["New campaign", "Themes", "Content", "Images", "Video", "Review", "Schedule"]

// Map UI steps to database steps - updated to include the new Video step
const uiToDatabaseStepMap = {
  0: 0, // New campaign -> 0
  1: 2, // Themes -> 2 (Generate Theme + Select Theme)
  2: 3, // Content -> 3 (Generate Post + Approve Post)
  3: 4, // Images -> 4 (Generate Images)
  4: 5, // Video -> 5 (Generate Video)
  5: 6, // Review -> 6 (Review)
  6: 7, // Schedule -> 7 (Completion)
  // Step 8 is reserved for fully scheduled campaigns
}

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
  const [campaign, setCampaign] = useState<Campaign | null>(initialCampaign || initialData?.campaign || null)
  const [themes, setThemes] = useState<Theme[]>(initialData?.themes || [])
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(initialData?.selectedTheme || null)
  const [posts, setPosts] = useState<Post[]>(initialData?.posts || [])
  const [selectedPosts, setSelectedPosts] = useState<Post[]>(initialData?.selectedPosts || [])
  const [postsWithImages, setPostsWithImages] = useState<Post[]>(initialData?.postsWithImages || [])
  const [postsWithVideos, setPostsWithVideos] = useState<Post[]>(initialData?.postsWithVideos || [])
  const [reviewedPosts, setReviewedPosts] = useState<Post[]>([])
  const [isWorkflowComplete, setIsWorkflowComplete] = useState(false)
  const { toast } = useToast()

  // Set initial step based on prop and initialize data
  useEffect(() => {
    // Initialize data from initialData
    if (initialData) {
      console.log("Initial data received:", initialData)

      // Set posts with images if available
      if (initialData.postsWithImages && initialData.postsWithImages.length > 0) {
        setPostsWithImages(initialData.postsWithImages)

        // If we're at or past the video step, also set these as postsWithVideos
        if (initialStep >= 5 && !initialData.postsWithVideos) {
          setPostsWithVideos(initialData.postsWithImages)
        }
      }

      // Set posts with videos if available
      if (initialData.postsWithVideos && initialData.postsWithVideos.length > 0) {
        setPostsWithVideos(initialData.postsWithVideos)
      }
    }

    if (initialStep > 0) {
      // Map database step to UI step
      let uiStep = initialStep

      // Handle special cases
      if (initialStep === 8) {
        // If campaign is fully scheduled (step 8), show completion step
        uiStep = 6
      } else if (initialStep === 7) {
        // If at completion step (7), show completion step
        uiStep = 6
      } else if (initialStep === 6) {
        // If at review step (6), show review step
        uiStep = 5
      } else if (initialStep === 5) {
        // If at generate video step (5), show video step
        uiStep = 4
      } else if (initialStep === 4) {
        // If at generate images step (4), show images step
        uiStep = 3
      } else if (initialStep === 3) {
        // If at generate/approve post step (3), show content step
        uiStep = 2
      } else if (initialStep === 2) {
        // If at generate/select theme step (2), show themes step
        uiStep = 1
      }

      setCurrentStep(uiStep)
    }
  }, [initialStep, initialData])

  // Debug logging for posts data
  useEffect(() => {
    console.log("Current posts with images:", postsWithImages)
    console.log("Current posts with videos:", postsWithVideos)
  }, [postsWithImages, postsWithVideos])

  const nextStep = async () => {
    const newStep = Math.min(currentStep + 1, steps.length - 1)
    setCurrentStep(newStep)

    // Update database step if we have a campaign ID
    if (campaign?.id) {
      const dbStep = uiToDatabaseStepMap[newStep as keyof typeof uiToDatabaseStepMap] || 0
      try {
        await updateCampaignStep(campaign.id, dbStep)
      } catch (error) {
        console.error("Failed to update campaign step:", error)
      }
    }
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleCreateCampaign = (data: Campaign) => {
    console.log("Campaign created with data:", data)
    // Ensure we have an ID before proceeding
    if (!data.id) {
      console.error("Campaign created but ID is missing")
      toast({
        title: "Error",
        description: "Campaign created but ID is missing. Please try again.",
        variant: "destructive",
      })
      return
    }

    setCampaign(data)
    // Use setTimeout to ensure state is updated before changing steps
    setTimeout(() => {
      nextStep()
    }, 0)
  }

  const handleThemeSelected = (theme: Theme) => {
    console.log("Theme selected:", theme)
    setSelectedTheme(theme)
    nextStep()
  }

  const handleApproveContent = (approvedPosts: Post[]) => {
    console.log("Posts approved:", approvedPosts)
    setSelectedPosts(approvedPosts)
    nextStep()
  }

  const handleGenerateImages = (updatedPosts: Post[]) => {
    console.log("Posts with images:", updatedPosts)
    // Store the posts with their image selection state
    setPostsWithImages(updatedPosts)

    // Also update the selectedPosts array to maintain consistency when going back
    setSelectedPosts((prevSelectedPosts) => {
      return prevSelectedPosts.map((prevPost) => {
        // Find the corresponding updated post
        const updatedPost = updatedPosts.find((p) => p.id === prevPost.id)
        // If found, use its updated data (including image selection state)
        return updatedPost || prevPost
      })
    })

    nextStep()
  }

  const handleGenerateVideos = (updatedPosts: Post[]) => {
    console.log("Posts with videos:", updatedPosts)
    setPostsWithVideos(updatedPosts)
    nextStep()
  }

  const handleReviewComplete = async (finalPosts: Post[]) => {
    console.log("Review completed with posts:", finalPosts)
    setReviewedPosts(finalPosts)

    // Update to step 7 (Completion) when review is complete
    if (campaign?.id) {
      try {
        const steps = await getCampaignSteps()

        // First update the local state to ensure UI consistency
        setCurrentStep(6) // Move to completion step (index 6 in steps array)

        // Then update the database - but don't rely on this for UI state
        await updateCampaignStep(campaign.id, steps.COMPLETION)
      } catch (error) {
        console.error("Failed to update campaign step:", error)
        toast({
          title: "Warning",
          description: "Review completed but step not updated in database",
          variant: "destructive",
        })
      }
    } else {
      // If no campaign ID, just update the UI state
      setCurrentStep(6)
    }

    // No need to call nextStep() since we've already set the current step directly
  }

  const handleScheduleComplete = () => {
    setIsWorkflowComplete(true)
    toast({
      title: "Campaign Scheduled",
      description: "Your campaign has been successfully scheduled and is ready to go!",
      variant: "success",
    })
  }

  // Add this function to handle going back from the completion step to the review step
  const handleBackToReview = () => {
    setCurrentStep(5) // Go back to the Review step (index 5 in the updated steps array)
  }

  // Determine which posts to use for the video step
  const getPostsForVideoStep = () => {
    // First priority: use postsWithVideos if available
    if (postsWithVideos && postsWithVideos.length > 0) {
      return postsWithVideos
    }

    // Second priority: use postsWithImages if available
    if (postsWithImages && postsWithImages.length > 0) {
      return postsWithImages
    }

    // Third priority: use selectedPosts if available
    if (selectedPosts && selectedPosts.length > 0) {
      return selectedPosts
    }

    // Fallback to empty array
    return []
  }

  // Determine which posts to use for the review step
  const getPostsForReviewStep = () => {
    // First priority: use postsWithVideos if available
    if (postsWithVideos && postsWithVideos.length > 0) {
      return postsWithVideos
    }

    // Second priority: use postsWithImages if available
    if (postsWithImages && postsWithImages.length > 0) {
      return postsWithImages
    }

    // Third priority: use selectedPosts if available
    if (selectedPosts && selectedPosts.length > 0) {
      return selectedPosts
    }

    // Fallback to empty array
    return []
  }

  return (
    <div
      className={`sm:bg-white sm:border-4 sm:border-black sm:rounded-lg sm:p-6 sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-2`}
    >
      <WorkflowProgress steps={steps} currentStep={currentStep} isWorkflowComplete={isWorkflowComplete} />

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mt-8"
      >
        {currentStep === 0 && <CreateCampaign onSubmit={handleCreateCampaign} initialData={initialCampaign} />}

        {currentStep === 1 && campaign && campaign.id && (
          <GenerateSelectTheme campaign={campaign} onThemeSelected={handleThemeSelected} onBack={prevStep} />
        )}

        {currentStep === 2 && campaign && selectedTheme && (
          <GenerateApproveContent
            campaign={campaign}
            theme={selectedTheme}
            onApprove={handleApproveContent}
            onBack={prevStep}
          />
        )}

        {currentStep === 3 && selectedPosts.length > 0 && (
          <GenerateMultipleImages
            posts={selectedPosts}
            onComplete={handleGenerateImages}
            onBack={prevStep}
            allowMissingImages={true} // Allow missing images
          />
        )}

        {currentStep === 4 && (
          <GenerateVideo posts={getPostsForVideoStep()} onComplete={handleGenerateVideos} onBack={prevStep} />
        )}

        {currentStep === 5 && (
          <ReviewPosts posts={getPostsForReviewStep()} onComplete={handleReviewComplete} onBack={prevStep} />
        )}

        {currentStep === 6 && campaign && selectedTheme && (
          <CompletionStep
            campaign={campaign}
            theme={selectedTheme}
            posts={reviewedPosts.length > 0 ? reviewedPosts : getPostsForReviewStep()}
            onScheduleComplete={handleScheduleComplete}
            onBack={handleBackToReview}
          />
        )}

        {/* Show loading or error state if data is missing for the current step */}
        {currentStep === 2 && (!campaign || !selectedTheme) && (
          <div className="text-center p-8">
            <p className="text-lg font-bold text-red-600">Missing data for content step</p>
            <p className="text-gray-600 mt-2">
              {!campaign && "Campaign data is missing. "}
              {!selectedTheme && "No theme has been selected. "}
              Please go back to the previous steps and complete them.
            </p>
            <button
              onClick={prevStep}
              className="mt-4 py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium"
            >
              Go Back
            </button>
          </div>
        )}

        {currentStep === 6 && (!campaign || !selectedTheme) && (
          <div className="text-center p-8">
            <p className="text-lg font-bold text-red-600">Missing data for scheduling step</p>
            <p className="text-gray-600 mt-2">
              {!campaign && "Campaign data is missing. "}
              {!selectedTheme && "No theme has been selected. "}
              Please go back to the previous steps and complete them.
            </p>
            <button
              onClick={() => setCurrentStep(5)} // Go back to Review step
              className="mt-4 py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium"
            >
              Go Back to Review
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
