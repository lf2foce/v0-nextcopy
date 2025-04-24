import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  Users,
  MessageSquare,
  ArrowRight,
  Calendar,
  TrendingUp,
  Clock,
  Target,
  BarChart,
  Brain,
} from "lucide-react"
import { notFound } from "next/navigation"
import { getTemplateById } from "@/lib/templates"

export default async function TemplateDetailPage({
  params: { id },
}: {
  params: { id: string }
}) {
  const templateId = Number.parseInt(id, 10)

  if (isNaN(templateId)) {
    notFound()
  }

  // Find the template
  const template = await getTemplateById(templateId)

  // If template doesn't exist, return 404
  if (!template) {
    notFound()
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <Link
          href="/templates"
          className="flex items-center gap-1 py-2 px-4 bg-gray-200 border-2 border-black rounded-md hover:bg-gray-300 w-fit"
        >
          <ArrowLeft size={16} />
          Quay lại Mẫu
        </Link>
      </div>

      <div className="bg-white border-4 border-black rounded-lg overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
        {/* Header with image and overlay */}
        <div className="h-64 relative">
          <Image src={template.image || "/placeholder.svg"} alt={template.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex justify-between items-end">
              <h1 className="text-4xl font-black text-white drop-shadow-md">{template.name}</h1>
              <span className="py-1 px-3 bg-white border-2 border-black rounded-md text-sm font-bold">
                {template.category}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xl mb-6">{template.description}</p>

          {/* Marketing metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-yellow-100 border-4 border-black rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} />
                <h3 className="font-bold">Tỷ lệ chuyển đổi</h3>
              </div>
              <p className="text-3xl font-black">{template.conversionRate}</p>
            </div>

            <div className="bg-blue-100 border-4 border-black rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} />
                <h3 className="font-bold">Tỷ lệ tương tác</h3>
              </div>
              <p className="text-3xl font-black">{template.engagementRate}</p>
            </div>

            <div className="bg-green-100 border-4 border-black rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={20} />
                <h3 className="font-bold">Thời lượng</h3>
              </div>
              <p className="text-3xl font-black">Everyday for {template.duration} days</p>
            </div>
          </div>

          {/* Customer Insight Section - New */}
          <div className="mb-8 bg-purple-100 border-4 border-black rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain size={20} />
              <h3 className="font-bold">Hiểu biết về khách hàng</h3>
            </div>
            <p className="text-gray-700">{template.customerInsight}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Target size={20} className="flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold">Đối tượng mục tiêu</h3>
                  <p>{template.targetAudience}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <BarChart size={20} className="flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold">Mục tiêu marketing</h3>
                  <ul className="list-disc pl-5 mt-1">
                    {template.marketingGoals.map((goal, index) => (
                      <li key={index}>{goal}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <MessageSquare size={20} className="flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold">Nội dung mẫu</h3>
                  <p>{template.sampleContent}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar size={20} className="flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold">Lịch sử sử dụng</h3>
                  <p>Đã được sử dụng {template.usageCount} lần</p>
                  {template.usageCount > 0 && (
                    <p className="text-sm text-gray-600 mt-1">Gần đây nhất: {template.campaignName}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Về mẫu này</h2>
            <p className="text-gray-700">{template.longDescription}</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Thực hành tốt nhất</h2>
            <div className="bg-blue-50 border-4 border-black rounded-lg p-4">
              <ul className="space-y-2">
                {template.bestPractices.map((practice, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="bg-blue-200 rounded-full p-1 mt-0.5">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <span>{practice}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Bài đăng mẫu</h2>
            <div className="space-y-4">
              {template.samplePosts.map((post, index) => (
                <div key={index} className="bg-gray-100 border-2 border-black rounded-md p-4">
                  <p>{post}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Thống kê hiệu suất</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-100 border-2 border-black rounded-md p-4">
                <h3 className="font-bold text-sm mb-1">Tỷ lệ nhấp chuột</h3>
                <p className="text-2xl font-bold">{template.performanceStats.clickThroughRate}</p>
              </div>

              <div className="bg-orange-100 border-2 border-black rounded-md p-4">
                <h3 className="font-bold text-sm mb-1">Giá trị đơn hàng trung bình</h3>
                <p className="text-2xl font-bold">{template.performanceStats.averageOrderValue}</p>
              </div>

              <div className="bg-green-100 border-2 border-black rounded-md p-4">
                <h3 className="font-bold text-sm mb-1">ROI quảng cáo</h3>
                <p className="text-2xl font-bold">{template.performanceStats.returnOnAdSpend}</p>
              </div>
            </div>
          </div>

          <Link
            href={`/create-campaign?template=${template.id}`}
            className="flex items-center justify-center gap-2 py-3 px-6 bg-green-400 border-4 border-black rounded-md font-bold text-lg hover:bg-green-500 transform hover:-translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full md:w-auto"
          >
            Sử dụng mẫu này
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </div>
  )
}
