"use client"
import { useState, useEffect } from "react"
import CampaignWorkflow from "@/components/campaign-workflow"
import { Loader2 } from "lucide-react"
import { testDatabaseConnection } from "@/lib/db"

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

  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "failed">("checking")
  const [isReady, setIsReady] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Check database connection before rendering the workflow
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await testDatabaseConnection()

        if (result.success) {
          console.log("Database connection successful")
          setConnectionStatus("connected")

          // Add a small delay to ensure all data is properly hydrated
          setTimeout(() => {
            setIsReady(true)
          }, 300)
        } else {
          console.error("Database connection failed:", result.error)
          setErrorMessage(result.error || "Unknown database error")
          setConnectionStatus("failed")

          // Retry connection if we haven't exceeded max attempts
          if (connectionAttempts < 3) {
            setConnectionAttempts((prev) => prev + 1)
            setTimeout(checkConnection, 1500) // Retry after 1.5 seconds
          }
        }
      } catch (error) {
        console.error("Error checking database connection:", error)
        setErrorMessage(error instanceof Error ? error.message : "Unknown error")
        setConnectionStatus("failed")

        // Retry connection if we haven't exceeded max attempts
        if (connectionAttempts < 3) {
          setConnectionAttempts((prev) => prev + 1)
          setTimeout(checkConnection, 1500) // Retry after 1.5 seconds
        }
      }
    }

    checkConnection()
  }, [connectionAttempts])

  if (!isReady) {
    return (
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-black mb-8">Continue Campaign Setup</h1>
        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex items-center justify-center mb-4">
              <Loader2 size={30} className="animate-spin text-black mr-3" />
              {connectionStatus === "checking" && (
                <p className="text-lg font-medium">
                  {connectionAttempts > 0
                    ? `Connecting to database (attempt ${connectionAttempts + 1}/4)...`
                    : "Connecting to database..."}
                </p>
              )}
              {connectionStatus === "connected" && <p className="text-lg font-medium">Preparing campaign data...</p>}
            </div>

            {connectionStatus === "failed" && connectionAttempts >= 3 && (
              <div className="text-center mt-4">
                <p className="text-red-600 font-medium">Connection failed after multiple attempts.</p>
                <p className="text-sm text-gray-600 mt-1">{errorMessage}</p>
                <button
                  onClick={() => setConnectionAttempts(0)}
                  className="mt-4 px-4 py-2 bg-yellow-300 border-2 border-black rounded-md font-medium"
                >
                  Try Again
                </button>
              </div>
            )}
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
