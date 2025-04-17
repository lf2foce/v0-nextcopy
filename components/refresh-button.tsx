"use client"

import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export default function RefreshButton() {
  const router = useRouter()
  const pathname = usePathname()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Force a hard refresh of the entire page
  const handleRefresh = () => {
    setIsRefreshing(true)

    // Clear any cache by adding a timestamp parameter
    const timestamp = new Date().getTime()
    const hasParams = pathname.includes("?")
    const separator = hasParams ? "&" : "?"
    const refreshUrl = `${pathname}${separator}_refresh=${timestamp}`

    // First, use router.refresh() to refresh server components
    router.refresh()

    // Then force a navigation to clear client-side state
    router.push(refreshUrl)

    // After navigation, remove the refresh parameter but keep the state cleared
    setTimeout(() => {
      router.replace(pathname)
      setIsRefreshing(false)
    }, 100)
  }

  // Clean up any refresh parameters on component mount
  useEffect(() => {
    if (pathname.includes("_refresh=")) {
      const cleanPath = pathname.split("?")[0]
      router.replace(cleanPath)
    }
  }, [pathname, router])

  return (
    <button
      onClick={handleRefresh}
      className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300 flex items-center justify-center gap-2 w-full sm:w-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 transition-all"
      disabled={isRefreshing}
    >
      <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
      {isRefreshing ? "Refreshing..." : "Refresh Page"}
    </button>
  )
}
