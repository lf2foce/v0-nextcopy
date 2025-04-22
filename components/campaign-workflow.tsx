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
import { updateCampaignStep } from "@/lib/actions"
import { getCampaignSteps } from "@/lib/campaign-steps"
import GenerateMultipleImages from "./steps/generate-multiple-images"
import { Campaign, Theme, Post, CampaignWorkflowProps } from "@/types"

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

  // Set initial step based on prop
  useEffect(() => {
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
  }, [initialStep])

  // Log initial data for debugging
  useEffect(() => {
    if (initialData) {
      console.log("Initial data received:", initialData)
    }
  }, [initialData])

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
    
    // Ensure we have a valid theme object with all required properties
    const enhancedTheme: Theme = {
      ...theme,
      id: theme.id,
      isSelected: true,
      title: theme.title || theme.name || "Selected Theme",
      name: theme.name || theme.title || "Selected Theme"
    }
    
    // Set the selected theme with enhanced properties
    setSelectedTheme(enhancedTheme)
    
    // Force the step change with a small delay to ensure state updates properly
    setTimeout(() => {
      console.log("Moving to content step with theme:", enhancedTheme)
      nextStep()
    }, 100)
  }

  const handleApproveContent = (approvedPosts: Post[]) => {
    setSelectedPosts(approvedPosts)
    nextStep()
  }

  const handleGenerateImages = (updatedPosts: Post[]) => {
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
    setPostsWithVideos(updatedPosts)
    nextStep()
  }

  const handleReviewComplete = async (finalPosts: Post[]) => {
    setReviewedPosts(finalPosts)

    // Update to step 7 (Completion) when review is complete
    if (campaign?.id) {
      try {
        const CAMPAIGN_STEPS = await getCampaignSteps()
        await updateCampaignStep(campaign.id, CAMPAIGN_STEPS.COMPLETION) // Now using 7 instead of 8
      } catch (error) {
        console.error("Failed to update campaign step:", error)
      }
    }

    nextStep()
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

  return (
    <div
      className="w-full max-w-full overflow-x-hidden mx-auto bg-white p-3 sm:p-4 md:p-6 border-2 sm:border-4 border-black rounded-md sm:rounded-lg sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
    >
      <WorkflowProgress steps={steps} currentStep={currentStep} isWorkflowComplete={isWorkflowComplete} />

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mt-4 sm:mt-6 md:mt-8"
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

        {currentStep === 4 && postsWithImages.length > 0 && (
          <GenerateVideo posts={postsWithImages} onComplete={handleGenerateVideos} onBack={prevStep} />
        )}

        {currentStep === 5 && (
          <ReviewPosts
            posts={postsWithVideos.length > 0 ? postsWithVideos : postsWithImages}
            onComplete={handleReviewComplete}
            onBack={prevStep}
          />
        )}

        {currentStep === 6 && campaign && selectedTheme && reviewedPosts.length > 0 && (
          <CompletionStep
            campaign={campaign}
            theme={selectedTheme}
            posts={reviewedPosts}
            onScheduleComplete={handleScheduleComplete}
            onBack={handleBackToReview}
          />
        )}

        {/* Show loading or error state if data is missing for the current step */}
        {currentStep === 2 && (!campaign || !selectedTheme) && (
          <div className="text-center p-3 sm:p-5 md:p-8 rounded-lg border-2 border-red-200 bg-red-50">
            <p className="text-base sm:text-lg font-bold text-red-600">Missing data for content step</p>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {!campaign && "Campaign data is missing. "}
              {!selectedTheme && "No theme has been selected. "}
              Please go back to the previous steps and complete them.
            </p>
            <button
              onClick={prevStep}
              className="mt-4 py-2 px-4 text-sm sm:text-base bg-yellow-300 border-2 border-black rounded-md font-medium hover:bg-yellow-400 min-h-[44px] min-w-[120px]"
            >
              Go Back
            </button>
          </div>
        )}

        {currentStep === 5 && (!postsWithImages || postsWithImages.length === 0) && (
          <div className="text-center p-3 sm:p-5 md:p-8 rounded-lg border-2 border-red-200 bg-red-50">
            <p className="text-base sm:text-lg font-bold text-red-600">Missing data for review step</p>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              No posts with images are available. Please go back to the previous steps and generate images first.
            </p>
            <button
              onClick={prevStep}
              className="mt-4 py-2 px-4 text-sm sm:text-base bg-yellow-300 border-2 border-black rounded-md font-medium hover:bg-yellow-400 min-h-[44px] min-w-[120px]"
            >
              Go Back
            </button>
          </div>
        )}

        {currentStep === 6 && (!campaign || !selectedTheme || reviewedPosts.length === 0) && (
          <div className="text-center p-3 sm:p-5 md:p-8 rounded-lg border-2 border-red-200 bg-red-50">
            <p className="text-base sm:text-lg font-bold text-red-600">Missing data for scheduling step</p>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              {!campaign && "Campaign data is missing. "}
              {!selectedTheme && "No theme has been selected. "}
              {reviewedPosts.length === 0 && "No reviewed posts are available. "}
              Please go back to the previous steps and complete them.
            </p>
            <button
              onClick={() => setCurrentStep(5)} // Go back to Review step
              className="mt-4 py-2 px-4 text-sm sm:text-base bg-yellow-300 border-2 border-black rounded-md font-medium hover:bg-yellow-400 min-h-[44px] min-w-[120px]"
            >
              Go Back to Review
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
