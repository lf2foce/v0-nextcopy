import { getCampaignWithStep, getCampaign } from "@/lib/actions"
import { notFound } from "next/navigation"
import CampaignEditClient from "./campaign-edit-client"
// import { unstable_noStore } from "next/cache"
import { connection } from 'next/server'

export default async function EditCampaignPage({
  params,
}: {
  params: { id: string }
}) {
  // Disable caching for this page
  await connection()

  try {
    // Use the Next.js 15 await params pattern
    const {id} = await params
    const campaignId = Number.parseInt(id, 10)

    if (isNaN(campaignId)) {
      notFound()
    }

    // Get both results in parallel for better performance
    const [campaignResult, fullCampaignResult] = await Promise.all([
      getCampaignWithStep(campaignId),
      getCampaign(campaignId),
    ])

    if (!campaignResult.success || !campaignResult.data) {
      notFound()
    }

    // Prepare initial data for the workflow
    const initialData: any = {
      campaign: campaignResult.data,
    }

    if (fullCampaignResult.success && fullCampaignResult.data) {
      // Add themes if available
      if (fullCampaignResult.data.allThemes?.length > 0) {
        initialData.themes = fullCampaignResult.data.allThemes
      }

      // Add selected theme if available
      if (fullCampaignResult.data.selectedTheme) {
        initialData.selectedTheme = fullCampaignResult.data.selectedTheme
      }

      // Add posts if available
      if (fullCampaignResult.data.allPosts?.length > 0) {
        initialData.posts = fullCampaignResult.data.allPosts
      }

      // Add approved posts if available
      if (fullCampaignResult.data.approvedPosts?.length > 0) {
        initialData.selectedPosts = fullCampaignResult.data.approvedPosts
      }

      // Add posts with images if available
      if (fullCampaignResult.data.postsWithImages?.length > 0) {
        initialData.postsWithImages = fullCampaignResult.data.postsWithImages
      }

      // Add posts with videos if available
      if (fullCampaignResult.data.postsWithVideos?.length > 0) {
        initialData.postsWithVideos = fullCampaignResult.data.postsWithVideos
      }
    }

    // Log the campaign step for debugging
    console.log(`Campaign ${campaignId} is at step ${campaignResult.data.currentStep}`)

    // Use the actual campaign step directly - our mapping will handle it correctly
    const displayStep = campaignResult.data.currentStep || 0

    return (
      <CampaignEditClient initialCampaign={campaignResult.data} initialStep={displayStep} initialData={initialData} />
    )
  } catch (error) {
    console.error("Error loading campaign:", error)
    throw error // Let Next.js error boundary handle this
  }
}
