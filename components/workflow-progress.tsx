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
    <div className="relative w-full overflow-x-auto pb-2">
      {/* Progress line */}
      <div className="absolute top-4 sm:top-5 left-0 w-full h-1 sm:h-2 bg-gray-200 -z-10"></div>
      
      {/* Steps container */}
      <ol className="flex justify-between w-full min-w-[480px]">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isActive = index === currentStep
          const isFinalStep = index === steps.length - 1
          const showFinalCheckmark = isFinalStep && isWorkflowComplete

          return (
            <li key={index} className="flex flex-col items-center px-1">
              {/* Circle indicator */}
              <div
                className={cn(
                  "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border-2 sm:border-4 border-black font-bold text-sm sm:text-lg",
                  showFinalCheckmark
                    ? "bg-green-400"
                    : isCompleted
                      ? "bg-green-400"
                      : isActive
                        ? "bg-yellow-300"
                        : "bg-white",
                )}
              >
                {isCompleted || showFinalCheckmark ? 
                  <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-black" /> : 
                  <span className="text-xs sm:text-base">{index + 1}</span>
                }
              </div>
              
              {/* Step label */}
              <span 
                className={cn(
                  "mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold text-center", 
                  isActive ? "text-black" : "text-gray-500"
                )}
              >
                {step}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
