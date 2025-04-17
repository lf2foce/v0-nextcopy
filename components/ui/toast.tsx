"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"

interface ToastProps {
  id: string
  title: string
  description: string
  variant?: "default" | "destructive" | "success"
  onClose: (id: string) => void
}

export function Toast({ id, title, description, variant = "default", onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(id), 300) // Wait for animation to complete
    }, 5000)

    return () => clearTimeout(timer)
  }, [id, onClose])

  const variantClasses = {
    default: "bg-white border-black",
    destructive: "bg-red-100 border-red-500",
    success: "bg-green-100 border-green-500",
  }

  return (
    <div
      className={`${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } transform transition-all duration-300 ease-in-out fixed bottom-4 right-4 p-4 rounded-md border-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-md z-50 ${
        variantClasses[variant]
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-gray-700">{description}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose(id), 300)
          }}
          className="ml-4 p-1 rounded-md hover:bg-gray-200"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export function ToastContainer({ toasts, onClose }: { toasts: any[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-4 z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  )
}
