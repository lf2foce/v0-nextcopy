import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-black mb-8">Continue Campaign Setup</h1>
      <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={40} className="animate-spin text-black mb-4" />
          <p className="text-lg font-medium">Loading campaign data...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
        </div>
      </div>
    </div>
  )
}
