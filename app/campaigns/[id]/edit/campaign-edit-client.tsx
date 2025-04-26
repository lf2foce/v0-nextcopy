"use client"
import { useState, useEffect } from "react"
import CampaignWorkflow from "@/components/campaign-workflow"
import { Loader2 } from "lucide-react"

export default function CampaignEditClient({
  initialCampaign,
  initialStep,
  initialData,
}: {
  initialCampaign: any
  initialStep: number
  initialData: any
}) {
  // Log the initial data for debugging
  useEffect(() => {
    console.log("Campaign Edit Client - Initial Campaign:", initialCampaign)
    console.log("Campaign Edit Client - Initial Step:", initialStep)
    console.log("Campaign Edit Client - Initial Data:", initialData)
  }, [initialCampaign, initialStep, initialData])

  const [isReady, setIsReady] = useState(false)

  // Add a delay to ensure all data is properly hydrated
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("Setting isReady to true")
      setIsReady(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [])

  if (!isReady) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-8">Continue Campaign Setup</h1>
        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-center py-8">
            <Loader2 size={30} className="animate-spin text-black mr-3" />
            <p className="text-lg font-medium">Preparing campaign data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-black mb-8">Continue Campaign Setup</h1>
      <CampaignWorkflow initialCampaign={initialCampaign} initialStep={initialStep} initialData={initialData} />
    </div>
  )
}
