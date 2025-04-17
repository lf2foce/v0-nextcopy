import Link from "next/link"
import { Lightbulb, BookOpen, Target, Calendar, PenTool, BarChart } from "lucide-react"

// Add revalidate at the module level
export const revalidate = 3600 // Revalidate every hour since guide content changes less frequently

export default function GuidePage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black">Campaign Creation Guide</h1>
      </div>

      <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-yellow-300 p-3 rounded-full border-4 border-black">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Getting Started</h2>
            <p className="text-gray-700 mb-4">
              Welcome to the Campaign Manager! This guide will help you create effective marketing campaigns that engage
              your audience and drive results.
            </p>
            <p className="text-gray-700 mb-4">
              Follow the steps below to create your first campaign. Each step is designed to help you craft compelling
              content that resonates with your target audience.
            </p>
            <Link
              href="/create-campaign"
              className="inline-flex items-center py-2 px-4 bg-green-400 border-2 border-black rounded-md font-medium hover:bg-green-500"
            >
              Start Creating
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-blue-200 p-3 rounded-full border-2 border-black">
              <Target size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Step 1: Define Your Campaign</h3>
              <p className="text-gray-700">
                Start by defining your campaign's name, description, target audience, and platform. Be specific about
                who you're trying to reach and what you want to achieve.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-purple-200 p-3 rounded-full border-2 border-black">
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Step 2: Generate & Select Themes</h3>
              <p className="text-gray-700">
                Our AI will generate theme options based on your campaign details. Choose the one that best fits your
                brand identity and campaign goals.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-green-200 p-3 rounded-full border-2 border-black">
              <PenTool size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Step 3: Create & Approve Content</h3>
              <p className="text-gray-700">
                Generate post content based on your campaign and selected theme. Review and approve the posts that best
                communicate your message.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-yellow-200 p-3 rounded-full border-2 border-black">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Step 4: Generate Images & Schedule</h3>
              <p className="text-gray-700">
                Generate images for your approved posts and schedule them for publication. Our system will automatically
                post them at the optimal times for engagement.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-red-200 p-3 rounded-full border-2 border-black">
              <BarChart size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Step 5: Monitor Performance</h3>
              <p className="text-gray-700">
                Track your campaign's performance and make adjustments as needed. Analyze engagement metrics to
                understand what's working and what can be improved.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-yellow-100 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-xl font-bold mb-2">Need Help?</h3>
        <p className="text-gray-700 mb-4">
          If you have any questions or need assistance, our support team is here to help.
        </p>
        <Link
          href="#"
          className="inline-flex items-center py-2 px-4 bg-blue-300 border-2 border-black rounded-md font-medium hover:bg-blue-400"
        >
          Contact Support
        </Link>
      </div>
    </div>
  )
}
