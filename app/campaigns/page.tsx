"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  PlusCircle,
  Instagram,
  Calendar,
  Eye,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Repeat,
  PauseCircle,
} from "lucide-react"
import { getAllCampaigns } from "@/lib/actions"
import RefreshButton from "@/components/refresh-button"

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState("all")

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        setLoading(true)
        const campaignsResult = await getAllCampaigns()

        if (campaignsResult.success) {
          setCampaigns(campaignsResult.data)
        } else {
          setError(campaignsResult.error || "Không thể tải chiến dịch")
        }
      } catch (err) {
        setError("Đã xảy ra lỗi khi tải chiến dịch")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  // Count campaigns by status
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter((c) => c.status === "scheduled" && c.isActive).length
  const draftCampaigns = campaigns.filter((c) => c.status === "draft").length
  const pausedCampaigns = campaigns.filter((c) => c.isActive === false).length

  // Filter campaigns based on active filter
  const filteredCampaigns = campaigns.filter((campaign) => {
    if (activeFilter === "all") return true
    if (activeFilter === "active") return campaign.status === "scheduled" && campaign.isActive
    if (activeFilter === "draft") return campaign.status === "draft"
    if (activeFilter === "paused") return campaign.isActive === false
    return true
  })

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-black">Campaigns</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <RefreshButton />
          <Link
            href="/create-campaign"
            className="flex items-center gap-2 py-2 sm:py-3 px-4 sm:px-6 bg-green-400 border-4 border-black rounded-md font-bold hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full sm:w-auto justify-center"
          >
            <PlusCircle size={18} />
            <span>Create New Campaign</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="bg-blue-100 border-4 border-black rounded-lg p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-bold mb-2">Total Campaigns</h3>
          <p className="text-4xl sm:text-5xl font-black">{totalCampaigns}</p>
        </div>

        <div className="bg-emerald-100 border-4 border-black rounded-lg p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-bold mb-2">Active Campaigns</h3>
          <p className="text-4xl sm:text-5xl font-black">{activeCampaigns}</p>
        </div>

        <div className="bg-amber-50 border-4 border-black rounded-lg p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-bold mb-2">Draft Campaigns</h3>
          <p className="text-4xl sm:text-5xl font-black">{draftCampaigns}</p>
        </div>

        <div className="bg-rose-100 border-4 border-black rounded-lg p-4 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="font-bold mb-2">Paused Campaigns</h3>
          <p className="text-4xl sm:text-5xl font-black">{pausedCampaigns}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveFilter("all")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "all" ? "bg-amber-300" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setActiveFilter("active")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "active" ? "bg-emerald-200" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setActiveFilter("draft")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "draft" ? "bg-amber-200" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Draft
        </button>
        <button
          onClick={() => setActiveFilter("paused")}
          className={`py-2 px-4 border-2 border-black rounded-md font-medium whitespace-nowrap ${
            activeFilter === "paused" ? "bg-rose-200" : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          Paused
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-4 border-black rounded-lg p-6 flex items-center gap-4">
          <AlertCircle className="text-red-500 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-lg">Error loading campaigns</h3>
            <p className="break-words">{error}</p>
          </div>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-gray-100 border-4 border-black rounded-lg p-6 text-center">
          <p className="text-lg font-bold mb-2">No campaigns found</p>
          <p className="mb-4">Create a new campaign to get started</p>
          <Link
            href="/create-campaign"
            className="inline-flex items-center gap-2 py-2 px-4 bg-green-400 border-2 border-black rounded-md font-medium hover:bg-green-500"
          >
            <PlusCircle size={16} />
            Create New Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredCampaigns.map((campaign) => {
            const isPaused = !campaign.isActive
            const isDraft = campaign.status === "draft"
            const isActive = campaign.status === "scheduled" && campaign.isActive

            let statusLabel = "Draft"
            let statusColor = "bg-amber-50"
            let statusBadge = "bg-amber-200"
            let statusIcon = null

            if (isPaused) {
              statusLabel = "Paused"
              statusColor = "bg-rose-50"
              statusBadge = "bg-rose-200"
              statusIcon = <PauseCircle size={16} className="mr-1" />
            } else if (isActive) {
              statusLabel = "Active"
              statusColor = "bg-emerald-50"
              statusBadge = "bg-emerald-200"
              statusIcon = <CheckCircle size={16} className="mr-1" />
            }

            return (
              <div
                key={campaign.id}
                className={`${statusColor} border-4 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col`}
              >
                <div className="flex justify-between items-start p-4">
                  <h3 className="text-lg sm:text-xl font-bold break-words pr-2">{campaign.name || campaign.title}</h3>
                  <span className="py-1 px-3 border-2 border-black rounded-md text-xs sm:text-sm font-medium flex-shrink-0 flex items-center">
                    {statusIcon}
                    {statusLabel}
                  </span>
                </div>

                <div className="p-4 pt-0 flex-1 flex flex-col">
                  <p className="text-gray-700 mb-4 text-sm sm:text-base line-clamp-2">{campaign.description}</p>

                  {isDraft && (
                    <div className="bg-yellow-200 border-2 border-black rounded-md p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-black flex-shrink-0"></div>
                        <span className="font-medium text-sm">
                          {campaign.currentStep && campaign.currentStep > 0
                            ? `Setup incomplete (Step ${campaign.currentStep} of 7)`
                            : "Setup just started"}
                        </span>
                      </div>
                    </div>
                  )}

                  {isPaused && (
                    <div className="bg-red-200 border-2 border-black rounded-md p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <PauseCircle size={16} className="flex-shrink-0" />
                        <span className="font-medium text-sm">Campaign is currently paused</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Repeat size={16} className="flex-shrink-0" />
                      <span className="text-sm">Everyday for {campaign.repeatEveryDays} days</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="flex-shrink-0" />
                      <span className="text-sm">
                        Starts:{" "}
                        {campaign.startDate instanceof Date
                          ? campaign.startDate.toLocaleDateString()
                          : campaign.startDate
                            ? new Date(campaign.startDate).toLocaleDateString()
                            : "Not set"}
                      </span>
                    </div>

                    {campaign.target || campaign.targetCustomer ? (
                      <div className="flex items-center gap-2">
                        <Instagram size={16} className="flex-shrink-0" />
                        <span className="text-sm">{campaign.target || campaign.targetCustomer}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 px-2 sm:px-4 bg-blue-300 border-2 border-black rounded-md font-medium hover:bg-blue-400 text-sm"
                    >
                      <Eye size={16} className="flex-shrink-0" />
                      <span>View Details</span>
                    </Link>

                    {isDraft && (
                      <Link
                        href={`/campaigns/${campaign.id}/edit`}
                        className="flex-1 flex items-center justify-center gap-1 py-2 px-2 sm:px-4 bg-green-400 border-2 border-black rounded-md font-medium hover:bg-green-500 text-sm"
                      >
                        <ArrowRight size={16} className="flex-shrink-0" />
                        <span>Continue Setup</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
