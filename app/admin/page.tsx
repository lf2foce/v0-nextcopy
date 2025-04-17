"use client"

import { useState } from "react"
import { Database, RefreshCw, SproutIcon as Seedling, AlertCircle, CheckCircle, BarChart } from "lucide-react"
import Link from "next/link"

export default function AdminPage() {
  const [isResetting, setIsResetting] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [result, setResult] = useState<{
    success?: boolean
    error?: string
    message?: string
    details?: any
  } | null>(null)
  const [adminToken, setAdminToken] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [dbStats, setDbStats] = useState<any>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  const handleReset = async () => {
    if (!adminToken.trim()) {
      setResult({
        success: false,
        error: "Admin token is required",
      })
      return
    }

    if (!confirm("WARNING: This will DELETE ALL DATA in your database. Are you sure?")) {
      return
    }

    setIsResetting(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action: "reset" }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: "Database has been reset successfully!",
          details: data.details,
        })
        // Refresh stats after successful reset
        fetchDatabaseStats()
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to reset database",
          details: data.details,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsResetting(false)
    }
  }

  const handleSeed = async () => {
    if (!adminToken.trim()) {
      setResult({
        success: false,
        error: "Admin token is required",
      })
      return
    }

    setIsSeeding(true)
    setResult(null)

    try {
      const response = await fetch("/api/admin/db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ action: "seed" }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult({
          success: true,
          message: data.skipped
            ? "Database already has data. Seeding skipped."
            : "Database has been seeded successfully!",
          details: data.details,
        })
        // Refresh stats after successful seeding
        fetchDatabaseStats()
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to seed database",
          details: data.details,
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSeeding(false)
    }
  }

  const fetchDatabaseStats = async () => {
    if (!adminToken.trim()) {
      setResult({
        success: false,
        error: "Admin token is required",
      })
      return
    }

    setIsLoadingStats(true)

    try {
      const response = await fetch("/api/admin/db/stats", {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setDbStats(data.stats)
      } else {
        setResult({
          success: false,
          error: data.error || "Failed to fetch database stats",
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsLoadingStats(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-black">Database Administration</h1>
      </div>

      <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-blue-300 p-3 rounded-full border-4 border-black">
            <Database size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Database Management</h2>
            <p className="text-gray-700 mb-4">
              Use these tools to manage your database. Be careful with the reset option as it will delete all your data!
            </p>

            <div className="mb-4">
              <label className="block font-bold mb-1" htmlFor="adminToken">
                Admin Token
              </label>
              <input
                id="adminToken"
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Enter your admin token"
              />
            </div>

            <div className="flex flex-wrap gap-4 mt-6">
              <button
                onClick={fetchDatabaseStats}
                disabled={isLoadingStats || !adminToken}
                className="flex items-center gap-2 py-3 px-6 bg-blue-400 border-4 border-black rounded-md font-bold text-lg hover:bg-blue-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                {isLoadingStats ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                    Loading Stats...
                  </>
                ) : (
                  <>
                    <BarChart size={20} />
                    Get Database Stats
                  </>
                )}
              </button>

              <button
                onClick={handleSeed}
                disabled={isSeeding || isResetting || !adminToken}
                className="flex items-center gap-2 py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                {isSeeding ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                    Seeding...
                  </>
                ) : (
                  <>
                    <Seedling size={20} />
                    Seed Database
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                disabled={isResetting || isSeeding || !adminToken}
                className="flex items-center gap-2 py-3 px-6 bg-red-400 border-4 border-black rounded-md font-bold text-lg hover:bg-red-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                {isResetting ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full"></div>
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    Reset Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {dbStats && (
        <div className="bg-white border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-purple-300 p-3 rounded-full border-4 border-black">
              <BarChart size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4">Database Statistics</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-100 border-4 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="font-bold mb-2">Campaigns</h3>
                  <p className="text-4xl font-black">{dbStats.campaigns || 0}</p>
                </div>

                <div className="bg-green-100 border-4 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="font-bold mb-2">Themes</h3>
                  <p className="text-4xl font-black">{dbStats.themes || 0}</p>
                </div>

                <div className="bg-yellow-100 border-4 border-black rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <h3 className="font-bold mb-2">Posts</h3>
                  <p className="text-4xl font-black">{dbStats.posts || 0}</p>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>Last updated: {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`bg-white border-4 rounded-lg p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
            result.success ? "border-green-500" : "border-red-500"
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full border-4 border-black ${result.success ? "bg-green-300" : "bg-red-300"}`}>
              {result.success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{result.success ? "Success" : "Error"}</h2>
              <p className="text-gray-700 mb-4">{result.success ? result.message : result.error}</p>

              {result.details && (
                <div className="mt-4">
                  <button onClick={() => setShowDetails(!showDetails)} className="text-blue-600 underline mb-2">
                    {showDetails ? "Hide Details" : "Show Details"}
                  </button>

                  {showDetails && (
                    <pre className="bg-gray-100 p-4 rounded-md border-2 border-black overflow-x-auto text-xs">
                      {typeof result.details === "string" ? result.details : JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 bg-yellow-100 border-4 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-xl font-bold mb-2">Important Notes</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            The <strong>Reset Database</strong> option will delete ALL data and recreate the schema.
          </li>
          <li>
            The <strong>Seed Database</strong> option will only add data if the database is empty.
          </li>
          <li>
            Set the <code>ADMIN_TOKEN</code> environment variable to secure these operations.
          </li>
          <li>These operations may take some time depending on your database size.</li>
        </ul>
        <div className="mt-4">
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 py-2 px-4 bg-blue-300 border-2 border-black rounded-md font-medium hover:bg-blue-400"
          >
            Back to Campaigns
          </Link>
        </div>
      </div>
    </div>
  )
}
