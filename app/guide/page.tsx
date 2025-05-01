"use client"
import Link from "next/link"
import { Lightbulb, BookOpen, Target, Calendar, PenTool, BarChart } from "lucide-react"

import { useLanguage } from "@/contexts/language-context"

export default function GuidePage() {
  const { translations } = useLanguage()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black">{translations.guideTitle}</h1>
      </div>

      <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-yellow-300 p-3 rounded-full border-4 border-black">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">{translations.gettingStartedTitle}</h2>
            <p className="text-gray-700 mb-4">{translations.gettingStartedDesc1}</p>
            <p className="text-gray-700 mb-4">{translations.gettingStartedDesc2}</p>
            <Link
              href="/create-campaign"
              className="inline-flex items-center py-2 px-4 bg-green-400 border-2 border-black rounded-md font-medium hover:bg-green-500"
            >
              {translations.startCreating}
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
              <h3 className="text-xl font-bold mb-2">{translations.step1Title}</h3>
              <p className="text-gray-700">{translations.step1Desc}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-purple-200 p-3 rounded-full border-2 border-black">
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{translations.step2Title}</h3>
              <p className="text-gray-700">{translations.step2Desc}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-green-200 p-3 rounded-full border-2 border-black">
              <PenTool size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{translations.step3Title}</h3>
              <p className="text-gray-700">{translations.step3Desc}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-yellow-200 p-3 rounded-full border-2 border-black">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{translations.step4Title}</h3>
              <p className="text-gray-700">{translations.step4Desc}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-start gap-4">
            <div className="bg-red-200 p-3 rounded-full border-2 border-black">
              <BarChart size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{translations.step5Title}</h3>
              <p className="text-gray-700">
              {translations.step5Desc}
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
