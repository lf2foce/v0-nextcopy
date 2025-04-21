"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { containerClasses, textClasses } from "@/lib/utils"

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  noPadding?: boolean
}

export function ResponsiveContainer({
  children,
  className,
  as: Component = "div",
  maxWidth = "xl",
  noPadding = false,
}: ResponsiveContainerProps) {
  // Define max width classes
  const maxWidthClasses = {
    xs: "max-w-xs", // 384px
    sm: "max-w-sm", // 512px
    md: "max-w-md", // 640px
    lg: "max-w-lg", // 768px
    xl: "max-w-xl", // 1024px
    "2xl": "max-w-2xl", // 1280px
    full: "max-w-full", // 100%
  }

  return (
    <Component
      className={cn(
        "w-full mx-auto",
        maxWidthClasses[maxWidth],
        !noPadding && "px-3 sm:px-4 md:px-6",
        className
      )}
    >
      {children}
    </Component>
  )
}

interface ResponsiveSectionProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  headerClassName?: string
  contentClassName?: string
  fullWidth?: boolean
}

export function ResponsiveSection({
  children,
  className,
  title,
  description,
  headerClassName,
  contentClassName,
  fullWidth = false,
}: ResponsiveSectionProps) {
  return (
    <section className={cn(containerClasses.section, className)}>
      {(title || description) && (
        <div className={cn("mb-4 sm:mb-6", headerClassName)}>
          {title && <h2 className={textClasses.h2}>{title}</h2>}
          {description && <p className={cn(textClasses.p, "mt-2")}>{description}</p>}
        </div>
      )}
      
      <div className={cn("w-full", contentClassName)}>
        {fullWidth ? children : (
          <ResponsiveContainer>
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  columns?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    "2xl"?: number
  }
  gap?: "none" | "xs" | "sm" | "md" | "lg"
}

export function ResponsiveGrid({
  children,
  className,
  columns = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
  },
  gap = "md",
}: ResponsiveGridProps) {
  // Define grid columns classes
  const getColumnsClasses = () => {
    const classes = []

    if (columns.xs) classes.push(`grid-cols-${columns.xs}`)
    if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`)
    if (columns.md) classes.push(`md:grid-cols-${columns.md}`)
    if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`)
    if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`)
    if (columns["2xl"]) classes.push(`2xl:grid-cols-${columns["2xl"]}`)

    return classes.join(" ")
  }

  // Define gap classes
  const gapClasses = {
    none: "gap-0",
    xs: "gap-1 sm:gap-2",
    sm: "gap-2 sm:gap-3 md:gap-4",
    md: "gap-3 sm:gap-4 md:gap-6",
    lg: "gap-4 sm:gap-6 md:gap-8",
  }

  return (
    <div
      className={cn(
        "grid w-full",
        getColumnsClasses(),
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  )
}

// Example usage component
export function ResponsiveLayoutDemo() {
  return (
    <ResponsiveSection
      title="Responsive Layout Example"
      description="This demonstrates how to use our responsive layout components"
    >
      <ResponsiveGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="md">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="bg-white border-2 border-black rounded-md p-3 sm:p-4"
          >
            <h3 className={textClasses.h3}>Item {item}</h3>
            <p className={textClasses.p}>This is a grid item that will respond to different screen sizes.</p>
          </div>
        ))}
      </ResponsiveGrid>
    </ResponsiveSection>
  )
} 