"use client"

import { UserButton, SignInButton, useUser } from "@clerk/nextjs"
import { LogIn } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export default function AuthButtons() {
  const { isLoaded, isSignedIn } = useUser()
  const { translations } = useLanguage()

  return (
    <>
      {!isSignedIn && isLoaded ? (
        <SignInButton mode="modal">
          <button className="flex items-center gap-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5">
            <LogIn size={16} />
            <span>{translations.signIn}</span>
          </button>
        </SignInButton>
      ) : (
        <UserButton afterSignOutUrl="/" />
      )}
    </>
  )
}