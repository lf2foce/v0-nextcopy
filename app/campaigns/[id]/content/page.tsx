import { getCampaign } from "@/lib/actions"
import { notFound } from "next/navigation"
import CampaignContentClient from "./campaign-content-client"

export default async function CampaignContentPage({
  params: { id },
}: {
  params: { id: string }
}) {
  try {
    const campaignId = Number.parseInt(id, 10)

    if (isNaN(campaignId)) {
      notFound()
    }

    // Fetch campaign data using server component
    const result = await getCampaign(campaignId)

    if (!result.success || !result.data) {
      notFound()
    }

    // Pass data to client component
    return <CampaignContentClient initialCampaign={result.data} campaignId={campaignId} />
  } catch (error) {
    console.error("Error loading campaign:", error)
    throw error // Let Next.js error boundary handle this
  }
}
