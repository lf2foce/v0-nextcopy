"use client"

import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowProgressProps {
  steps: string[]
  currentStep: number
  isWorkflowComplete?: boolean
}

export default function WorkflowProgress({ steps, currentStep, isWorkflowComplete = false }: WorkflowProgressProps) {
  return (
    <div className="relative">
      <div className="absolute top-5 left-0 w-full h-2 bg-gray-200 -z-10"></div>
      <ol className="flex justify-between w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          const isFinalStep = index === steps.length - 1
          const showFinalCheckmark = isFinalStep && isWorkflowComplete

          return (
            <li key={index} className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-full border-4 border-black font-bold text-lg",
                  showFinalCheckmark
                    ? "bg-green-400"
                    : isCompleted
                      ? "bg-green-400"
                      : isActive
                        ? "bg-yellow-300"
                        : "bg-white",
                )}
              >
                {isCompleted || showFinalCheckmark ? <CheckIcon className="w-5 h-5 text-black" /> : index + 1}
              </div>
              <span className={cn("mt-2 text-xs font-bold", isActive ? "text-black" : "text-gray-500")}>{step}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
