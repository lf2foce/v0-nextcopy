import { Suspense } from "react"
import CampaignWorkflow from "@/components/campaign-workflow"
import { Loader2 } from "lucide-react"

export default function CreateCampaignPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-black mb-8">Create New Campaign</h1>
      <Suspense fallback={<LoadingState />}>
        <CampaignWorkflow />
      </Suspense>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 size={40} className="animate-spin text-black mb-4" />
      <p className="text-lg font-medium">Loading campaign creator...</p>
    </div>
  )
}
