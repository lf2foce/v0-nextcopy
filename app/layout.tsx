import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider } from "@/components/toast-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import Sidebar from "@/components/sidebar"

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
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <SidebarProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <main className="flex-1 p-4 md:p-6 lg:p-10 bg-yellow-50 w-full overflow-x-hidden">{children}</main>
            </div>
          </SidebarProvider>
        </ToastProvider>
      </body>
    </html>
  )
}


import './globals.css'