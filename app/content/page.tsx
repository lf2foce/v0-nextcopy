import Image from "next/image"
import { FileText, Instagram, ThumbsUp, Calendar } from "lucide-react"

// Add revalidate at the module level
export const revalidate = 300 // Revalidate every 5 minutes

export default function ContentPage() {
  // Mock data for content
  const posts = [
    {
      id: 1,
      content: "Introducing our summer collection! Perfect for those hot days and cool nights. #SummerVibes",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
      likes: 245,
      campaignName: "Summer Collection 2025",
      platform: "Instagram",
      scheduledDate: "Apr 15, 2025",
      status: "scheduled",
    },
    {
      id: 2,
      content: "Beat the heat with our new summer essentials. Limited time offer - shop now! #SummerSale",
      image: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=600&auto=format&fit=crop",
      likes: 189,
      campaignName: "Summer Collection 2025",
      platform: "Instagram",
      scheduledDate: "Apr 20, 2025",
      status: "scheduled",
    },
    {
      id: 3,
      content: "Summer is calling! Discover our new collection designed for your perfect summer days.",
      image: "https://images.unsplash.com/photo-1527090526205-beaac8dc3c62?q=80&w=600&auto=format&fit=crop",
      likes: 312,
      campaignName: "Summer Collection 2025",
      platform: "Instagram",
      scheduledDate: "Apr 25, 2025",
      status: "draft",
    },
  ]

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-black">Content</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        <button className="py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium whitespace-nowrap">
          All
        </button>
        <button className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium whitespace-nowrap">
          Scheduled
        </button>
        <button className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium whitespace-nowrap">
          Published
        </button>
        <button className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium whitespace-nowrap">
          Draft
        </button>
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white border-4 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/3 relative h-64 md:h-auto">
                <Image src={post.image || "/placeholder.svg"} alt="Post image" fill className="object-cover" />
              </div>

              <div className="p-4 md:p-6 flex-1">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                  <h3 className="text-xl font-bold">{post.campaignName}</h3>
                  <span
                    className={`py-1 px-3 border-2 border-black rounded-md text-sm font-medium inline-block ${
                      post.status === "scheduled" ? "bg-green-200" : "bg-yellow-200"
                    }`}
                  >
                    {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{post.content}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {post.content
                    .split(" ")
                    .filter((word) => word.startsWith("#"))
                    .map((hashtag, index) => (
                      <span
                        key={index}
                        className="py-1 px-3 bg-yellow-200 border-2 border-black rounded-md text-sm font-medium"
                      >
                        {hashtag}
                      </span>
                    ))}
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Instagram size={16} className="shrink-0" />
                    <span>{post.platform}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar size={16} className="shrink-0" />
                    <span>{post.scheduledDate}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <ThumbsUp size={16} className="shrink-0" />
                    <span>{post.likes} likes</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <FileText size={16} className="shrink-0" />
                    <span>Post #{post.id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
