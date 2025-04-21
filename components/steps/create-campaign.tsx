"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import type { Campaign } from "../campaign-workflow"
import { createCampaign } from "@/lib/actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle } from "lucide-react"

// Template data - in a real app, this would come from a database
const templates = [
  {
    id: 1,
    name: "Bold & Vibrant",
    description: "High contrast colors with bold typography for maximum impact",
    targetAudience: "Fashion enthusiasts aged 18-35",
    sampleContent: "Introducing our latest collection with bold colors and striking imagery!",
    customerInsight:
      "Gen Z and young millennials are 3x more likely to engage with bold, high-contrast visuals that stand out in social feeds. They make purchasing decisions based on brand aesthetics and visual impact.",
  },
  {
    id: 2,
    name: "Minimalist",
    description: "Clean, simple designs with plenty of white space",
    targetAudience: "Design professionals and sophisticated users",
    sampleContent: "Simplicity is the ultimate sophistication. Discover our minimalist product line.",
    customerInsight:
      "Design-conscious consumers value products that embody 'less is more' philosophy. They're willing to pay premium prices for products with clean aesthetics and thoughtful functionality.",
  },
  {
    id: 3,
    name: "Retro Wave",
    description: "80s inspired neon colors and geometric patterns",
    targetAudience: "Millennials and Gen Z with nostalgia",
    sampleContent: "Take a trip back in time with our retro-inspired collection!",
    customerInsight:
      "Younger consumers have strong nostalgia for eras they never experienced firsthand. Retro aesthetics create emotional connections and perceived authenticity that drives 27% higher engagement.",
  },
  {
    id: 4,
    name: "Nature Inspired",
    description: "Organic shapes and earthy color palette",
    targetAudience: "Environmentally conscious consumers",
    sampleContent: "Immerse yourself in the beauty of nature with our sustainable products.",
    customerInsight:
      "Eco-conscious consumers are increasingly making purchasing decisions based on sustainability credentials. 64% are willing to pay more for products that align with their environmental values.",
  },
]

// Update the Campaign type to match the new schema
interface CreateCampaignProps {
  onSubmit: (data: Campaign) => void
  initialData?: Campaign
}

export default function CreateCampaign({ onSubmit, initialData }: CreateCampaignProps) {
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")

  // Use a ref to track if we've shown the toast for this template
  const toastShownRef = useRef<string | null>(null)

  const [formData, setFormData] = useState<Campaign>({
    name: "",
    description: "",
    target: "",
    insight: "",
    repeatEveryDays: 7,
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof templates)[0] | null>(null)
  const { toast } = useToast()

  // Initialize form with initial data if provided
  useEffect(() => {
    if (initialData) {
      // Ensure all required fields have default values to prevent controlled/uncontrolled input switching
      setFormData({
        id: initialData.id,
        name: initialData.name || initialData.title || "",
        description: initialData.description || "",
        target: initialData.target || initialData.targetCustomer || "",
        insight: initialData.insight || "",
        repeatEveryDays: initialData.repeatEveryDays || 7,
        startDate: initialData.startDate || new Date(),
      })
    }
  }, [initialData])

  // Handle template application without causing infinite loops
  useEffect(() => {
    if (!templateId) return

    const template = templates.find((t) => t.id === Number.parseInt(templateId, 10))
    if (!template) return

    // Set the selected template
    setSelectedTemplate(template)

    // Update form data with more meaningful customer insight
    setFormData((prev) => ({
      ...prev,
      name: template.name + " Campaign",
      description: template.description,
      target: template.targetAudience,
      insight: template.customerInsight, // Use the detailed customer insight
    }))

    // Show toast only if we haven't shown it for this template yet
    if (toastShownRef.current !== templateId) {
      toast({
        title: "Template Applied",
        description: `The "${template.name}" template has been applied to your campaign.`,
      })
      // Mark this template as having shown the toast
      toastShownRef.current = templateId
    }
  }, [templateId]) // Only depend on templateId, not toast or other changing values

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const parsedValue = Number.parseInt(value, 10)
    setFormData((prev) => ({
      ...prev,
      [name]: isNaN(parsedValue) ? 0 : parsedValue,
    }))
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: new Date(value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // If we have an ID, we're editing an existing campaign
      if (formData.id) {
        // Just pass the data back to parent
        onSubmit(formData)
        return
      }

      const result = await createCampaign(formData)

      if (result.success && result.data) {
        toast({
          title: "Campaign created",
          description: "Your campaign has been created successfully.",
        })

        // Make sure we're passing the complete campaign object with the ID from the database
        const campaignWithId = {
          ...formData,
          id: result.data.id,
        }

        console.log("Campaign created successfully with ID:", result.data.id)

        // Call onSubmit with the updated campaign object
        onSubmit(campaignWithId)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create campaign",
          variant: "destructive",
        })
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("Campaign creation error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  // Get today's date in YYYY-MM-DD format for the min attribute
  const today = new Date().toISOString().split("T")[0]

  // Format the startDate for the value attribute - ensure it's never undefined
  const formattedStartDate = formData.startDate instanceof Date ? formData.startDate.toISOString().split("T")[0] : today

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black mb-2">Create Your Campaign</h2>
        <p className="text-gray-700">Start by defining your campaign details</p>
      </div>

      {selectedTemplate && (
        <div className="bg-yellow-100 border-4 border-black rounded-md p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold">Template Applied: {selectedTemplate.name}</h3>
              <p className="text-sm">
                Some fields have been pre-filled based on this template. Feel free to modify them.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-bold mb-1" htmlFor="name">
            Campaign Title
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Summer Sale 2025"
          />
        </div>

        <div>
          <label className="block font-bold mb-1" htmlFor="description">
            Campaign Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Describe your campaign goals and objectives"
          />
        </div>

        <div>
          <label className="block font-bold mb-1" htmlFor="target">
            Target Customer
          </label>
          <input
            id="target"
            name="target"
            type="text"
            required
            value={formData.target}
            onChange={handleChange}
            className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Young adults interested in fashion"
          />
        </div>

        <div>
          <label className="block font-bold mb-1" htmlFor="insight">
            Customer Insight
          </label>
          <textarea
            id="insight"
            name="insight"
            value={formData.insight || ""}
            onChange={handleChange}
            rows={3}
            className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="Share deep insights about your target customers' behaviors, motivations, or preferences"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold mb-1" htmlFor="repeatEveryDays">
              Number of Posts to Generate
            </label>
            <input
              id="repeatEveryDays"
              name="repeatEveryDays"
              type="number"
              required
              min="1"
              max="365"
              value={formData.repeatEveryDays}
              onChange={handleNumberChange}
              className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter number of posts"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold mb-1" htmlFor="startDate">
            Start Date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            min={today} // Giá trị min này cho phép chọn ngày hôm nay
            value={formattedStartDate}
            onChange={handleDateChange}
            className="w-full p-3 border-4 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-6 bg-yellow-300 border-4 border-black rounded-md font-bold text-lg hover:bg-yellow-400 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-70"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <Loader2 className="animate-spin mr-2" size={20} />
              Creating...
            </span>
          ) : (
            "Continue to Theme Generation"
          )}
        </button>
      </form>
    </div>
  )
}
