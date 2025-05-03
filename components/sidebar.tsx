"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Flag, PlusCircle, Menu, X } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"
import { SignedIn } from "@clerk/nextjs"
import { CreditsDisplay } from "./CreditsDisplay"
import TranslationButton from "./TranslationButton"
import AuthButtons from "./AuthButtons"

export default function Sidebar() {
  const pathname = usePathname()
  
  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const { language, translations } = useLanguage()

  // Check if we're on mobile and close sidebar by default
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // Changed from 768 to 1024 to include medium viewport
      if (window.innerWidth < 1024) {
        // Changed from 768 to 1024
        setIsOpen(false)
      } else {
        setIsOpen(true)
      }
    }

    // Initial check
    checkMobile()

    // Add event listener for window resize
    window.addEventListener("resize", checkMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <>
      {/* Mobile menu button - fixed to the top left with green background */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-green-400 p-2 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile when sidebar is open */}
      {isMobile && isOpen && <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setIsOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:sticky top-0 left-0 z-40 h-screen bg-white border-r-4 border-black transition-transform duration-300 ease-in-out w-64 lg:translate-x-0 shadow-lg flex flex-col`}
      >
        {/* Main content */}
        <div className="flex-1">
          <div className="border-b border-black/10">
            <div className="p-4 pt-12 md:pt-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black">Campaign Manager</h1>
                <div className="h-4 w-4 bg-yellow-300 rounded-full mt-1 border-2 border-black"></div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <nav className="space-y-1">
              {/* Remove the SignInButton section from here */}
              <Link
                href="/guide"
                className={`flex items-center w-full py-3 px-4 rounded-md font-medium transition-colors ${
                  isActive("/guide")
                    ? "bg-yellow-300 border-2 border-black"
                    : "hover:bg-gray-100 border-2 border-transparent"
                }`}
                onClick={() => isMobile && setIsOpen(false)}
              >
                <LayoutDashboard className="mr-2" size={20} />
                <span>{translations.guide}</span>
              </Link>

              <Link
                href="/campaigns"
                className={`flex items-center w-full py-3 px-4 rounded-md font-medium transition-colors ${
                  isActive("/campaigns")
                    ? "bg-yellow-300 border-2 border-black"
                    : "hover:bg-gray-100 border-2 border-transparent"
                }`}
                onClick={() => isMobile && setIsOpen(false)}
              >
                <Flag className="mr-2" size={20} />
                <span>{translations.campaigns}</span>
              </Link>

              {/* Templates and Content links removed */}

             
            </nav>

            <div className="mt-6">
              <Link
                href="/create-campaign"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-400 border-4 border-black rounded-md font-bold hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                onClick={() => isMobile && setIsOpen(false)}
              >
                <PlusCircle size={18} />
                {translations.createNewCampaign}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center justify-between space-x-2">
            <SignedIn>
              <CreditsDisplay />
            </SignedIn>
            <div className="flex items-center gap-2">
              <TranslationButton />
              <AuthButtons />
            </div>
          </div>
        </div>
      </aside>

      {/* Add padding to compensate for the fixed mobile menu button - increased margin */}
      <div className="lg:hidden h-16"></div>
    </>
  )
}
