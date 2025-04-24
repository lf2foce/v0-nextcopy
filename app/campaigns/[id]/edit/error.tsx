"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Campaign edit error:", error)
  }, [error])

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-black mb-8">Continue Campaign Setup</h1>
      <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-red-100 p-3 rounded-full border-4 border-black mb-4">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
          <p className="text-gray-700 mb-6 text-center max-w-md">
            We encountered an issue while loading your campaign. This is often due to a temporary connection problem.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => reset()}
              className="py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium hover:bg-yellow-400 flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Try again
            </button>
            <button
              onClick={() => router.push("/campaigns")}
              className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300"
            >
              Back to campaigns
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
