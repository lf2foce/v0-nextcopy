import Link from "next/link"
import { Lightbulb } from "lucide-react"
import { unstable_noStore } from "next/cache"

export default function DashboardPage() {
  // Disable caching for this page
  unstable_noStore()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black">Dashboard</h1>
      </div>

      <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-yellow-300 p-3 rounded-full border-4 border-black">
            <Lightbulb size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Campaign Guidelines</h2>
            <p className="text-gray-700 mb-4">
              Follow these best practices to create effective marketing campaigns that engage your audience and drive
              results.
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>Define clear goals and target audience for each campaign</li>
              <li>Choose themes that align with your brand identity</li>
              <li>Create content that resonates with your audience</li>
              <li>Schedule posts at optimal times for engagement</li>
              <li>Monitor performance and adjust your strategy as needed</li>
            </ul>
            <p className="text-gray-700">
              Need more help? Check out our{" "}
              <Link href="#" className="text-blue-600 underline">
                comprehensive guide
              </Link>{" "}
              or{" "}
              <Link href="#" className="text-blue-600 underline">
                contact support
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-100 border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-bold mb-2">Total Campaigns</h3>
          <p className="text-5xl font-black">4</p>
        </div>

        <div className="bg-green-100 border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-bold mb-2">Active Campaigns</h3>
          <p className="text-5xl font-black">0</p>
        </div>

        <div className="bg-yellow-100 border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-bold mb-2">Draft Campaigns</h3>
          <p className="text-5xl font-black">4</p>
        </div>
      </div>
    </div>
  )
}
