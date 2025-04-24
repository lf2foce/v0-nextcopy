import { getCampaign } from "@/lib/actions"
import { notFound } from "next/navigation"
import CampaignDetailClient from "./campaign-detail-client"

export default async function CampaignDetailPage({
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
    return <CampaignDetailClient initialCampaign={result.data} />
  } catch (error) {
    console.error("Error loading campaign:", error)
    throw error // Let Next.js error boundary handle this
  }
}
