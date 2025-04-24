import { getCampaignWithStep, getCampaign } from "@/lib/actions"
import CampaignWorkflow from "@/components/campaign-workflow"
import { notFound } from "next/navigation"

export default async function EditCampaignPage({ params }: { params: { id: string } }) {
  const campaignId = Number.parseInt(params.id, 10)

  if (isNaN(campaignId)) {
    notFound()
  }

  try {
    // Get the campaign with its current step
    const campaignResult = await getCampaignWithStep(campaignId)

    if (!campaignResult.success || !campaignResult.data) {
      notFound()
    }

    // Get the campaign with all related data
    const fullCampaignResult = await getCampaign(campaignId)

    // Prepare initial data for the workflow
    const initialData: any = {
      campaign: campaignResult.data,
    }

    if (fullCampaignResult.success && fullCampaignResult.data) {
      // Add themes if available
      if (fullCampaignResult.data.allThemes && fullCampaignResult.data.allThemes.length > 0) {
        initialData.themes = fullCampaignResult.data.allThemes
      }

      // Add selected theme if available
      if (fullCampaignResult.data.selectedTheme) {
        initialData.selectedTheme = fullCampaignResult.data.selectedTheme
      }

      // Add posts if available
      if (fullCampaignResult.data.allPosts && fullCampaignResult.data.allPosts.length > 0) {
        initialData.posts = fullCampaignResult.data.allPosts
      }

      // Add approved posts if available
      if (fullCampaignResult.data.approvedPosts && fullCampaignResult.data.approvedPosts.length > 0) {
        initialData.selectedPosts = fullCampaignResult.data.approvedPosts
      }

      // Add posts with images if available (for step 6)
      if (fullCampaignResult.data.postsWithImages && fullCampaignResult.data.postsWithImages.length > 0) {
        initialData.postsWithImages = fullCampaignResult.data.postsWithImages
      }
    }

    // If the campaign is at step 7 (scheduled), we should still show step 6 (completion) when editing
    const displayStep = campaignResult.data.currentStep === 7 ? 6 : campaignResult.data.currentStep || 0

    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-8">Continue Campaign Setup</h1>
        <CampaignWorkflow initialCampaign={campaignResult.data} initialStep={displayStep} initialData={initialData} />
      </div>
    )
  } catch (error) {
    console.error("Error loading campaign:", error)
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-8">Error Loading Campaign</h1>
        <div className="bg-red-100 border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-lg">There was an error loading this campaign. Please try again later.</p>
        </div>
      </div>
    )
  }
}
