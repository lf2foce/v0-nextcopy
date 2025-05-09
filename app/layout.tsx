import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider } from "@/components/toast-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import Sidebar from "@/components/sidebar"
import { Analytics } from "@vercel/analytics/react"
import { LanguageProvider } from "@/contexts/language-context"
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Campaign Manager",
  description: "Create and manage your marketing campaigns",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ToastProvider>
            <LanguageProvider>
              <SidebarProvider>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 p-4 md:p-6 lg:p-10 bg-yellow-50 w-full overflow-x-hidden pt-16">
                    {children}
                    <Analytics />
                  </main>
                </div>
              </SidebarProvider>
            </LanguageProvider>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
