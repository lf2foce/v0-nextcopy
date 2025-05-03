"use client"

import { Globe } from "lucide-react"
import { useLanguage } from "@/contexts/language-context"

export default function TranslationButton() {
  const { language, setLanguage } = useLanguage()
  
  return (
    <button 
      onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
      className="flex items-center gap-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] px-3 py-1.5"
    >
      <Globe size={16} />
      <span>{language === 'en' ? 'VN' : 'EN'}</span>
    </button>
  )
}