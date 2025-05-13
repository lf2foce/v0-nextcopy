import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, Users, TrendingUp, Clock } from "lucide-react"

export const revalidate = 300 // Revalidate every 5 minutes

export default function TemplatesPage() {
  // Updated campaign templates data with more marketing-focused information and deeper customer insights
  const templates = [
    {
      id: 1,
      name: "Sắc Màu Táo Bạo",
      description: "Chiến dịch marketing với màu sắc tương phản mạnh mẽ và hình ảnh ấn tượng",
      color: "#FF5733",
      image: "/dynamic-growth-burst.png",
      campaignName: "Bộ Sưu Tập Mùa Hè 2025",
      usageCount: 2,
      sampleContent: "Giới thiệu bộ sưu tập mới với màu sắc táo bạo và hình ảnh ấn tượng!",
      targetAudience: "Người yêu thời trang từ 18-35 tuổi",
      customerInsight:
        "Khách hàng trẻ tuổi thường tìm kiếm các sản phẩm thời trang giúp họ nổi bật và thể hiện cá tính. Họ đánh giá cao các thương hiệu dám thử nghiệm và phá vỡ quy tắc truyền thống.",
      duration: 7,
      conversionRate: "8.5%",
      engagementRate: "12.3%",
      category: "Thời trang",
    },
    {
      id: 2,
      name: "Tối Giản Hiện Đại",
      description: "Chiến dịch tinh tế với thiết kế đơn giản và nhiều khoảng trắng",
      color: "#2D3436",
      image: "/single-word-impact.png",
      campaignName: "Ra Mắt Sản Phẩm Quý 2",
      usageCount: 1,
      sampleContent: "Đơn giản là đỉnh cao của tinh tế. Khám phá dòng sản phẩm tối giản của chúng tôi.",
      targetAudience: "Chuyên gia thiết kế và người dùng tinh tế",
      customerInsight:
        "Người tiêu dùng cao cấp đánh giá cao sự tinh tế và chất lượng hơn là số lượng tính năng. Họ sẵn sàng chi trả nhiều hơn cho sản phẩm có thiết kế tinh tế và trải nghiệm người dùng liền mạch.",
      duration: 14,
      conversionRate: "7.2%",
      engagementRate: "9.8%",
      category: "Công nghệ",
    },
    {
      id: 3,
      name: "Hoài Niệm Thập Niên 80",
      description: "Chiến dịch hoài cổ với màu neon và họa tiết hình học của thời kỳ 80s",
      color: "#6C5CE7",
      image: "/neon-drive-in.png",
      campaignName: "Chiến Dịch Tựu Trường",
      usageCount: 1,
      sampleContent: "Hãy quay ngược thời gian với bộ sưu tập lấy cảm hứng từ phong cách retro!",
      targetAudience: "Millennials và Gen Z với tình yêu hoài niệm",
      customerInsight:
        "Thế hệ trẻ hiện nay có xu hướng hoài niệm về những thời kỳ họ chưa từng trải qua. Họ tìm kiếm sự kết nối cảm xúc thông qua các yếu tố văn hóa đại chúng từ quá khứ, đặc biệt là thập niên 80-90.",
      duration: 10,
      conversionRate: "9.1%",
      engagementRate: "15.7%",
      category: "Giải trí",
    },
    {
      id: 4,
      name: "Gần Gũi Thiên Nhiên",
      description: "Chiến dịch bền vững với hình dáng hữu cơ và bảng màu trái đất",
      color: "#00B894",
      image: "/blossoming-brand.png",
      campaignName: "Sáng Kiến Thân Thiện Môi Trường",
      usageCount: 0,
      sampleContent: "Hòa mình vào vẻ đẹp của thiên nhiên với các sản phẩm bền vững của chúng tôi.",
      targetAudience: "Người tiêu dùng có ý thức về môi trường",
      customerInsight:
        "Người tiêu dùng ngày càng quan tâm đến tác động môi trường của các sản phẩm họ mua. Nghiên cứu cho thấy 73% khách hàng sẵn sàng trả thêm cho các sản phẩm bền vững và có nguồn gốc đạo đức.",
      duration: 21,
      conversionRate: "6.8%",
      engagementRate: "11.2%",
      category: "Bền vững",
    },
    {
      id: 5,
      name: "Mùa Lễ Hội",
      description: "Chiến dịch mùa lễ hội với màu sắc ấm áp và hình ảnh lễ kỷ niệm",
      color: "#E17055",
      image: "/festive-market-joy.png",
      campaignName: "Khuyến Mãi Cuối Năm",
      usageCount: 3,
      sampleContent: "Mùa lễ hội đã đến! Khám phá những món quà hoàn hảo cho người thân yêu.",
      targetAudience: "Người mua sắm quà tặng mùa lễ hội",
      customerInsight:
        "Trong mùa lễ hội, người tiêu dùng thường chịu áp lực tìm món quà hoàn hảo và có xu hướng mua sắm trễ. 64% người mua sắm coi trọng giá trị cảm xúc của món quà hơn là giá trị vật chất.",
      duration: 30,
      conversionRate: "12.5%",
      engagementRate: "18.3%",
      category: "Lễ hội",
    },
    {
      id: 6,
      name: "Khuyến Mãi Flash",
      description: "Chiến dịch khuyến mãi ngắn hạn với cảm giác khẩn cấp cao",
      color: "#D63031",
      image: "/dynamic-flash-sale.png",
      campaignName: "Khuyến Mãi 24h",
      usageCount: 5,
      sampleContent: "Chỉ trong 24 giờ! Giảm giá sốc cho các sản phẩm bán chạy nhất của chúng tôi.",
      targetAudience: "Người tiêu dùng tìm kiếm ưu đãi",
      customerInsight:
        "Tâm lý sợ bỏ lỡ (FOMO) là động lực mạnh mẽ trong quyết định mua hàng. Nghiên cứu cho thấy 60% người tiêu dùng đưa ra quyết định mua hàng trong vòng 24 giờ khi cảm thấy một ưu đãi sắp kết thúc.",
      duration: 1,
      conversionRate: "15.7%",
      engagementRate: "22.4%",
      category: "Khuyến mãi",
    },
  ]

  // Group templates by category
  const categories = [...new Set(templates.map((template) => template.category))]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black">Mẫu Chiến Dịch Marketing</h1>
          <p className="text-gray-700 mt-2">Chọn một mẫu để bắt đầu chiến dịch marketing tiếp theo của bạn</p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-2">
        <button className="py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-medium whitespace-nowrap">
          Tất cả
        </button>
        {categories.map((category) => (
          <button
            key={category}
            className="py-2 px-4 bg-gray-200 border-2 border-black rounded-md font-medium whitespace-nowrap hover:bg-gray-300"
          >
            {category}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white border-4 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 group"
          >
            {/* Template image with overlay */}
            <div className="h-48 relative">
              <Image src={template.image || "/placeholder.svg"} alt={template.name} fill className="object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="bg-white px-3 py-1 rounded-full border-2 border-black text-sm font-bold">
                  {template.category}
                </span>
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-xl font-black mb-2">{template.name}</h3>
              <p className="text-gray-700 mb-4 line-clamp-2">{template.description}</p>

              {/* Marketing metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-yellow-100 border-2 border-black rounded-md p-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={14} className="shrink-0" />
                    <span className="text-xs font-medium">Tỷ lệ chuyển đổi</span>
                  </div>
                  <p className="font-bold">{template.conversionRate}</p>
                </div>

                <div className="bg-blue-100 border-2 border-black rounded-md p-2">
                  <div className="flex items-center gap-1">
                    <Users size={14} className="shrink-0" />
                    <span className="text-xs font-medium">Tương tác</span>
                  </div>
                  <p className="font-bold">{template.engagementRate}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="shrink-0 text-gray-500" />
                  <span className="font-medium text-sm">Everyday for {template.duration} days</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={16} className="shrink-0 text-gray-500" />
                  <span className="font-medium text-sm">Đã dùng {template.usageCount} lần</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Link
                  href={`/create-campaign?template=${template.id}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 px-4 bg-yellow-300 border-2 border-black rounded-md font-bold hover:bg-yellow-400 transition-all group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <span>Sử dụng mẫu này</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href={`/templates/${template.id}`}
                  className="flex-1 flex items-center justify-center py-2 px-4 bg-white border-2 border-black rounded-md font-medium hover:bg-gray-100 transition-all"
                >
                  Xem chi tiết
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
