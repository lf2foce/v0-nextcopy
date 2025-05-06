"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import CreateCampaign from "./steps/create-campaign"
import GenerateSelectTheme from "./steps/generate-select-theme"
import GenerateApproveContent from "./steps/generate-approve-content"
import GenerateMultipleImages from "./steps/generate-multiple-images"
import GenerateVideo from "./steps/generate-video"
import ReviewPosts from "./steps/review-posts"
import CompletionStep from "./steps/completion-step"
import WorkflowProgress from "./workflow-progress"
import { useToast } from "@/hooks/use-toast"
import { updateCampaignStep } from "@/lib/actions"
import { getCampaignSteps } from "@/lib/campaign-steps"

// Update the Campaign type to match the new schema
export type Campaign = {
  id?: number
  name: string
  description: string
  target: string
  insight?: string
  content_type?: string
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
  imageGenerated?: boolean
  videoGenerated?: boolean
  campaignId?: number
  themeId?: number
  isApproved?: boolean
  isScheduled?: boolean
  title?: string
  status?: string
  images?: string
}

// Updated steps - added Video step between Images and Review
const steps = ["Idea", "Themes", "Content", "Images", "Video", "Review", "Schedule"]

// Map database steps to UI steps
const dbToUiStepMap = {
  0: 0, // New campaign -> 0
  1: 0, // Draft -> 0
  2: 1, // Theme Selection -> 1
  3: 2, // Content Creation -> 2
  4: 3, // Image Selection -> 3
  5: 4, // Video Selection -> 4
  6: 5, // Review -> 5
  7: 6, // Completion -> 6 (Schedule step in UI)
  8: 6, // Scheduled -> 6 (still show Schedule step)
}

// Map UI steps to database steps
const uiToDatabaseStepMap = {
  0: 0, // New campaign -> 0
  1: 2, // Themes -> 2 (Generate Theme + Select Theme)
  2: 3, // Content -> 3 (Generate Post + Approve Post)
  3: 4, // Images -> 4 (Generate Images)
  4: 5, // Video -> 5 (Generate Video)
  5: 6, // Review -> 6 (Review)
  6: 7, // Schedule -> 7 (Completion)
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
  const [currentStep, setCurrentStep] = useState(0)
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
    if (initialStep !== undefined) {
      // Map database step to UI step using the mapping object
      const uiStep = dbToUiStepMap[initialStep as keyof typeof dbToUiStepMap] || 0
      console.log(`Mapping database step ${initialStep} to UI step ${uiStep}`)
      setCurrentStep(uiStep)

      // Only set as complete if we're at step 8 (SCHEDULED)
      if (initialStep === 8) {
        setIsWorkflowComplete(true)
      }
    }
  }, [initialStep])

  // Log initial data for debugging
  useEffect(() => {
    if (initialData) {
      console.log("Initial data received:", initialData)

      // Log the counts of posts in each category for debugging
      console.log(`- All posts: ${initialData.posts?.length || 0}`)
      console.log(`- Selected posts: ${initialData.selectedPosts?.length || 0}`)
      console.log(`- Posts with images: ${initialData.postsWithImages?.length || 0}`)
      console.log(`- Posts with videos: ${initialData.postsWithVideos?.length || 0}`)
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
    setSelectedTheme(theme)
    nextStep()
  }

  const handleApproveContent = (approvedPosts: Post[]) => {
    console.log(`Content step completed with ${approvedPosts.length} approved posts`)
    setSelectedPosts(approvedPosts)
    setPosts(approvedPosts) // Also update the main posts array
    nextStep()
  }

  const handleGenerateImages = (updatedPosts: Post[]) => {
    console.log(`Image step completed with ${updatedPosts.length} posts`)
    // Store the posts with their image selection state
    setPostsWithImages(updatedPosts)
    setPosts(updatedPosts) // Update the main posts array

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
    console.log(`Video step completed with ${updatedPosts.length} posts`)

    // Store all posts from the Video Step, regardless of whether they have videos
    setPostsWithVideos(updatedPosts)
    setPosts(updatedPosts) // Update the main posts array

    // CRITICAL: Update selectedPosts to ensure all posts are preserved
    setSelectedPosts(updatedPosts)

    nextStep()
  }

  const handleReviewComplete = async (finalPosts: Post[]) => {
    console.log(`Review step completed with ${finalPosts.length} posts`)
    setReviewedPosts(finalPosts)
    setPosts(finalPosts) // Update the main posts array

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

  const handleScheduleComplete = async () => {
    // Immediately set workflow as complete to update UI
    setIsWorkflowComplete(true)

    // Update to step 8 (SCHEDULED) when scheduling is complete
    if (campaign?.id) {
      try {
        const CAMPAIGN_STEPS = await getCampaignSteps()
        console.log("Updating campaign to SCHEDULED step:", CAMPAIGN_STEPS.SCHEDULED)
        const result = await updateCampaignStep(campaign.id, CAMPAIGN_STEPS.SCHEDULED)
        console.log("Update campaign step result:", result)

        if (result.success) {
          // Also update the local campaign object to reflect the new step
          if (campaign) {
            setCampaign({
              ...campaign,
              currentStep: CAMPAIGN_STEPS.SCHEDULED,
            })
          }

          toast({
            title: "Campaign Scheduled",
            description: "Your campaign has been successfully scheduled and is ready to go!",
            variant: "success",
          })
        } else {
          console.error("Failed to update campaign step:", result.error)
          toast({
            title: "Warning",
            description: "Campaign was scheduled but status update failed. Please refresh the page.",
            variant: "warning",
          })
        }
      } catch (error) {
        console.error("Failed to update campaign step:", error)
        toast({
          title: "Warning",
          description: "Campaign was scheduled but status update failed. Please refresh the page.",
          variant: "warning",
        })
      }
    } else {
      toast({
        title: "Campaign Scheduled",
        description: "Your campaign has been successfully scheduled and is ready to go!",
        variant: "success",
      })
    }
  }

  // Add this function to handle going back from the completion step to the review step
  const handleBackToReview = () => {
    setCurrentStep(5) // Go back to the Review step (index 5 in the updated steps array)
  }

  // Determine which posts to use for the current step
  const getPostsForCurrentStep = () => {
    // If we have reviewed posts, use those
    if (reviewedPosts.length > 0) return reviewedPosts

    // For the Review Step (step 5) and Schedule Step (step 6), ALWAYS use selectedPosts which contains ALL posts
    if (currentStep === 5 || currentStep === 6) {
      console.log(`Using selectedPosts for step ${currentStep} with ${selectedPosts.length} posts`)
      return selectedPosts.length > 0 ? selectedPosts : posts
    }

    // For other steps, use the most recently updated collection
    if (postsWithVideos.length > 0) return postsWithVideos
    if (postsWithImages.length > 0) return postsWithImages
    if (selectedPosts.length > 0) return selectedPosts

    return posts
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

        {currentStep === 1 && campaign && (
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
          <GenerateVideo
            posts={selectedPosts.length > 0 ? selectedPosts : posts}
            onComplete={handleGenerateVideos}
            onBack={prevStep}
            skipIfNoImages={true}
          />
        )}

        {currentStep === 5 && (
          <ReviewPosts posts={getPostsForCurrentStep()} onComplete={handleReviewComplete} onBack={prevStep} />
        )}

        {currentStep === 6 && campaign && selectedTheme && (
          <CompletionStep
            campaign={campaign}
            theme={selectedTheme}
            posts={getPostsForCurrentStep()}
            onScheduleComplete={handleScheduleComplete}
            onBack={handleBackToReview}
            isComplete={isWorkflowComplete}
          />
        )}

        {/* Show loading or error state if data is missing for the current step */}
        {currentStep === 1 && !campaign && (
          <div className="text-center p-8">
            <p className="text-lg font-bold text-red-600">Missing campaign data</p>
            <p className="text-gray-600 mt-2">
              Campaign data is missing. Please go back to the previous step and create a campaign.
            </p>
            <button
              onClick={prevStep}
              className="mt-4 py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium"
            >
              Go Back
            </button>
          </div>
        )}

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

        {currentStep === 3 && (!selectedPosts || selectedPosts.length === 0) && (
          <div className="text-center p-8">
            <p className="text-lg font-bold text-red-600">Missing data for images step</p>
            <p className="text-gray-600 mt-2">
              No posts have been approved. Please go back to the previous step and approve some posts.
            </p>
            <button
              onClick={prevStep}
              className="mt-4 py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium"
            >
              Go Back
            </button>
          </div>
        )}

        {currentStep === 5 && (!selectedPosts || selectedPosts.length === 0) && (
          <div className="text-center p-8">
            <p className="text-lg font-bold text-red-600">Missing data for review step</p>
            <p className="text-gray-600 mt-2">
              No posts are available. Please go back to the previous steps and generate content first.
            </p>
            <button
              onClick={prevStep}
              className="mt-4 py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium"
            >
              Go Back
            </button>
          </div>
        )}

        {currentStep === 6 && (!campaign || !selectedTheme || getPostsForCurrentStep().length === 0) && (
          <div className="text-center p-8">
            <p className="text-lg font-bold text-red-600">Missing data for scheduling step</p>
            <p className="text-gray-600 mt-2">
              {!campaign && "Campaign data is missing. "}
              {!selectedTheme && "No theme has been selected. "}
              {getPostsForCurrentStep().length === 0 && "No reviewed posts are available. "}
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
