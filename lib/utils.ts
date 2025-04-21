import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Responsive container classes
export const containerClasses = {
  // Main page container
  page: "w-full max-w-full overflow-x-hidden px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8",
  
  // Card container with border and shadow
  card: "w-full bg-white p-3 sm:p-4 md:p-6 border-2 sm:border-4 border-black rounded-md sm:rounded-lg sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]",
  
  // Simple section container
  section: "w-full mb-4 sm:mb-6 md:mb-8",
  
  // Flex container for layout
  flexRow: "flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4",
  flexBetween: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4",
}

// Responsive text classes
export const textClasses = {
  // Page headings
  h1: "text-xl sm:text-2xl md:text-3xl font-black leading-tight",
  h2: "text-lg sm:text-xl md:text-2xl font-bold leading-tight",
  h3: "text-base sm:text-lg md:text-xl font-bold leading-tight",
  
  // Paragraph styles
  p: "text-sm sm:text-base text-gray-700 leading-relaxed",
  small: "text-xs sm:text-sm text-gray-500",
  
  // Special text styles
  label: "text-xs sm:text-sm font-medium",
  error: "text-xs sm:text-sm text-red-600",
  success: "text-xs sm:text-sm text-green-600",
}

// Button classes
export const buttonClasses = {
  // Primary action button
  primary: "py-2 px-4 text-sm sm:text-base bg-yellow-300 border-2 border-black rounded-md font-medium hover:bg-yellow-400 min-h-[44px] min-w-[120px] active:translate-y-1 transition-transform",
  
  // Secondary action button
  secondary: "py-2 px-4 text-sm sm:text-base bg-gray-200 border-2 border-black rounded-md font-medium hover:bg-gray-300 min-h-[44px] min-w-[100px] active:translate-y-1 transition-transform",
  
  // Danger/delete button
  danger: "py-2 px-4 text-sm sm:text-base bg-red-400 text-white border-2 border-black rounded-md font-medium hover:bg-red-500 min-h-[44px] min-w-[100px] active:translate-y-1 transition-transform",
  
  // Small/icon button
  icon: "p-2 bg-white border-2 border-gray-300 rounded-md hover:bg-gray-100 min-h-[40px] min-w-[40px] flex items-center justify-center active:translate-y-1 transition-transform",
}

// Grid classes
export const gridClasses = {
  // Responsive grid for cards/items
  cards: "grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6",
  
  // Two column layout
  twoCol: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6",
  
  // Three column layout with first column larger
  sidebar: "grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 md:gap-6",
}

// Input field classes
export const inputClasses = {
  // Standard input
  input: "w-full h-10 px-3 py-2 text-sm sm:text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent",
  
  // Textarea
  textarea: "w-full p-3 text-sm sm:text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent min-h-[100px]",
  
  // Select dropdown
  select: "w-full h-10 px-3 py-2 text-sm sm:text-base border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent appearance-none bg-white",
  
  // Checkbox/radio
  checkbox: "w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 border-2 border-gray-300 rounded focus:ring-yellow-400",
}

// Message/alert classes
export const alertClasses = {
  // Info message
  info: "p-3 sm:p-4 bg-blue-50 border-2 border-blue-200 rounded-md text-sm sm:text-base text-blue-800",
  
  // Success message
  success: "p-3 sm:p-4 bg-green-50 border-2 border-green-200 rounded-md text-sm sm:text-base text-green-800",
  
  // Warning message
  warning: "p-3 sm:p-4 bg-yellow-50 border-2 border-yellow-200 rounded-md text-sm sm:text-base text-yellow-800",
  
  // Error message
  error: "p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-md text-sm sm:text-base text-red-800",
}
