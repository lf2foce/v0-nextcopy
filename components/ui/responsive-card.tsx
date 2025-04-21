"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { containerClasses, textClasses, buttonClasses } from "@/lib/utils"

interface ResponsiveCardProps {
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  withPadding?: boolean
}

export function ResponsiveCard({
  title,
  description,
  children,
  footer,
  className,
  withPadding = true,
}: ResponsiveCardProps) {
  return (
    <div className={cn(
      containerClasses.card,
      withPadding ? "p-3 sm:p-4 md:p-6" : "p-0",
      className
    )}>
      <div className={cn(
        withPadding ? "mb-3 sm:mb-4" : "p-3 sm:p-4 md:p-5"
      )}>
        <h3 className={textClasses.h3}>{title}</h3>
        {description && <p className={cn(textClasses.p, "mt-1")}>{description}</p>}
      </div>
      
      {children && (
        <div className={cn(
          withPadding ? "" : "px-3 sm:px-4 md:px-5"
        )}>
          {children}
        </div>
      )}
      
      {footer && (
        <div className={cn(
          "mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200",
          withPadding ? "" : "px-3 sm:px-4 md:px-5 pb-3 sm:pb-4"
        )}>
          {footer}
        </div>
      )}
    </div>
  )
}

interface ResponsiveCardActionProps {
  className?: string
  children: React.ReactNode
}

export function ResponsiveCardActions({ className, children }: ResponsiveCardActionProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end",
      className
    )}>
      {children}
    </div>
  )
}

interface ResponsiveCardContentProps {
  className?: string
  children: React.ReactNode
}

export function ResponsiveCardContent({ className, children }: ResponsiveCardContentProps) {
  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      {children}
    </div>
  )
}

export function ResponsiveCardDemo() {
  return (
    <ResponsiveCard 
      title="Responsive Card Example" 
      description="This card component uses our responsive utility classes"
    >
      <ResponsiveCardContent>
        <p className={textClasses.p}>
          This card will adjust appropriately on different screen sizes. 
          Text, padding, and layout all respond to viewport changes.
        </p>
        
        <div className="bg-gray-50 p-3 sm:p-4 rounded-md">
          <h4 className={cn(textClasses.h3, "text-base")}>Content Section</h4>
          <p className={textClasses.small}>
            This is an example of nested content that also uses responsive classes.
          </p>
        </div>
      </ResponsiveCardContent>
      
      <ResponsiveCardActions>
        <button className={buttonClasses.secondary}>Cancel</button>
        <button className={buttonClasses.primary}>Save Changes</button>
      </ResponsiveCardActions>
    </ResponsiveCard>
  )
} 