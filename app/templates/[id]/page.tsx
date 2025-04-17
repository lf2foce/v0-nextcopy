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
    longDescription:
      "Mẫu Sắc Màu Táo Bạo sử dụng màu sắc tương phản cao và kiểu chữ đậm để tạo tác động thị giác tối đa. Mẫu này hoàn hảo cho việc ra mắt sản phẩm, khuyến mãi bán hàng và bất kỳ chiến dịch nào bạn muốn thu hút sự chú ý nhanh chóng. Các yếu tố thiết kế bắt mắt và đáng nhớ, giúp thông điệp của bạn nổi bật trong các bảng tin xã hội đông đúc.",
    samplePosts: [
      "Tạo ấn tượng với bộ sưu tập mới của chúng tôi! Màu sắc táo bạo thu hút mọi ánh nhìn. #DẫnĐầuXuHướng #LựaChọnTáoBạo",
      "Nổi bật giữa đám đông với những thiết kế biết nói. Các sản phẩm phiên bản giới hạn đã có sẵn!",
      "Cuộc sống quá ngắn để mặc những bộ quần áo nhàm chán. Khám phá dòng sản phẩm táo bạo mới của chúng tôi ngay hôm nay! #ThểHiệnBảnThân",
    ],
    marketingGoals: ["Tăng nhận diện thương hiệu", "Thu hút khách hàng mới", "Tăng doanh số bán hàng"],
    bestPractices: [
      "Sử dụng hình ảnh chất lượng cao với màu sắc tương phản",
      "Tạo nội dung ngắn gọn, trực tiếp với lời kêu gọi hành động rõ ràng",
      "Tập trung vào lợi ích sản phẩm và cảm xúc của người dùng",
    ],
    performanceStats: {
      clickThroughRate: "5.2%",
      averageOrderValue: "1.250.000₫",
      returnOnAdSpend: "3.8x",
    },
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
    longDescription:
      "Mẫu Tối Giản Hiện Đại áp dụng triết lý 'ít là nhiều' với thiết kế sạch sẽ, đơn giản và nhiều khoảng trắng. Mẫu này hoạt động tốt cho các thương hiệu cao cấp, sản phẩm công nghệ và dịch vụ chuyên nghiệp nơi mong muốn một thẩm mỹ tinh tế, không rườm rà. Cách tiếp cận tối giản tập trung sự chú ý vào sản phẩm và thông điệp của bạn mà không có sự phân tâm.",
    samplePosts: [
      "Đơn giản là đỉnh cao của tinh tế. Giới thiệu bộ sưu tập tối giản của chúng tôi. #ÍtLàNhiều",
      "Đường nét tinh tế. Thiết kế tinh tế. Chất lượng vượt trội. Dòng sản phẩm mới của chúng tôi ra mắt hôm nay.",
      "Không phân tâm, chỉ có sự xuất sắc trong thiết kế. Khám phá bộ sưu tập tối giản của chúng tôi ngay bây giờ. #ThiếtKếTinhTế",
    ],
    marketingGoals: [
      "Xây dựng hình ảnh thương hiệu cao cấp",
      "Tăng giá trị trung bình đơn hàng",
      "Tiếp cận khách hàng cao cấp",
    ],
    bestPractices: [
      "Sử dụng nhiều khoảng trắng và bố cục tối giản",
      "Tập trung vào chất lượng và thiết kế sản phẩm",
      "Sử dụng ngôn ngữ tinh tế và chuyên nghiệp",
    ],
    performanceStats: {
      clickThroughRate: "4.8%",
      averageOrderValue: "2.750.000₫",
      returnOnAdSpend: "3.2x",
    },
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
    longDescription:
      "Mẫu Hoài Niệm Thập Niên 80 nắm bắt bản chất của thẩm mỹ thập niên 80 với màu sắc neon, họa tiết hình học và các yếu tố thiết kế hoài cổ. Mẫu này lý tưởng cho các chiến dịch nhắm đến millennials và Gen Z, những người đánh giá cao thẩm mỹ retro. Nó hoàn hảo cho thời trang, âm nhạc, giải trí và các thương hiệu lối sống muốn gợi lên sự hoài niệm và vui tươi.",
    samplePosts: [
      "Quay ngược thời gian! Bộ sưu tập retro của chúng tôi mang lại những điều tốt nhất của thập niên 80 với một chút hiện đại. #KhôngKhíRetro",
      "Giấc mơ neon và thiết kế táo bạo. Thập niên 80 đang gọi, và họ có phong cách tuyệt vời! #SóngRetro",
      "Một số thứ không bao giờ lỗi thời. Bộ sưu tập lấy cảm hứng từ retro của chúng tôi đã sẵn sàng để chứng minh điều đó. #MãiMãiThậpNiên80",
    ],
    marketingGoals: ["Tạo cảm giác hoài niệm", "Tăng tương tác trên mạng xã hội", "Thu hút khách hàng trẻ"],
    bestPractices: [
      "Sử dụng màu sắc neon và họa tiết hình học đặc trưng của thập niên 80",
      "Kết hợp yếu tố hoài niệm với xu hướng hiện đại",
      "Tạo nội dung vui nhộn và dễ chia sẻ",
    ],
    performanceStats: {
      clickThroughRate: "6.7%",
      averageOrderValue: "950.000₫",
      returnOnAdSpend: "4.2x",
    },
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
    longDescription:
      "Mẫu Gần Gũi Thiên Nhiên sử dụng hình dáng hữu cơ và bảng màu trái đất để tạo cảm giác hài hòa và bền vững. Mẫu này hoàn hảo cho các thương hiệu thân thiện với môi trường, sản phẩm chăm sóc sức khỏe và thiết bị ngoài trời. Các yếu tố thiết kế gợi lên sự kết nối với thiên nhiên và ý thức về môi trường, thu hút người tiêu dùng ưu tiên tính bền vững.",
    samplePosts: [
      "Hòa hợp với thiên nhiên. Bộ sưu tập bền vững của chúng tôi tốt cho bạn và hành tinh. #ThânThiệnVớiMôiTrường",
      "Lấy cảm hứng từ thế giới tự nhiên, được chế tác cho người tiêu dùng có ý thức. Khám phá các sản phẩm thân thiện với trái đất của chúng tôi ngay hôm nay.",
      "Vẻ đẹp không nhất thiết phải đánh đổi bằng trái đất. Bộ sưu tập tự nhiên của chúng tôi chứng minh điều đó. #SốngBềnVững",
    ],
    marketingGoals: [
      "Nâng cao nhận thức về bền vững",
      "Thu hút khách hàng có ý thức về môi trường",
      "Xây dựng hình ảnh thương hiệu có trách nhiệm",
    ],
    bestPractices: [
      "Nhấn mạnh các thực hành bền vững và nguyên liệu thân thiện với môi trường",
      "Sử dụng hình ảnh thiên nhiên và màu sắc trái đất",
      "Chia sẻ câu chuyện về tác động tích cực đến môi trường",
    ],
    performanceStats: {
      clickThroughRate: "5.9%",
      averageOrderValue: "1.450.000₫",
      returnOnAdSpend: "3.5x",
    },
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
    longDescription:
      "Mẫu Mùa Lễ Hội nắm bắt tinh thần của mùa lễ hội với màu sắc ấm áp, hình ảnh lễ hội và các yếu tố thiết kế theo mùa. Mẫu này hoàn hảo cho các chiến dịch mùa lễ hội, khuyến mãi quà tặng và sự kiện đặc biệt. Thiết kế ấm áp và thân thiện tạo cảm giác vui vẻ và hào hứng, khuyến khích mua sắm quà tặng và tham gia vào tinh thần lễ hội.",
    samplePosts: [
      "Mùa lễ hội đã đến! Khám phá bộ sưu tập quà tặng đặc biệt của chúng tôi cho những người thân yêu. #MùaLễHội",
      "Làm ấm trái tim người thân yêu với những món quà ý nghĩa. Xem bộ sưu tập mùa lễ hội của chúng tôi ngay hôm nay!",
      "Tạo nên những kỷ niệm đáng nhớ mùa này với những món quà đặc biệt từ bộ sưu tập lễ hội của chúng tôi. #QuàTặngHoànHảo",
    ],
    marketingGoals: [
      "Tăng doanh số bán hàng mùa lễ hội",
      "Xây dựng lòng trung thành của khách hàng",
      "Tăng giá trị đơn hàng trung bình",
    ],
    bestPractices: [
      "Tạo cảm giác khẩn cấp với các ưu đãi giới hạn thời gian",
      "Nhấn mạnh vào giá trị cảm xúc của quà tặng",
      "Cung cấp hướng dẫn quà tặng và đề xuất sản phẩm",
    ],
    performanceStats: {
      clickThroughRate: "7.8%",
      averageOrderValue: "1.850.000₫",
      returnOnAdSpend: "4.5x",
    },
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
    longDescription:
      "Mẫu Khuyến Mãi Flash được thiết kế để tạo cảm giác khẩn cấp và thúc đẩy hành động nhanh chóng. Với màu sắc nổi bật và ngôn ngữ tạo cảm giác khẩn cấp, mẫu này hoàn hảo cho các đợt giảm giá flash, khuyến mãi giới hạn thời gian và sự kiện bán hàng đặc biệt. Thiết kế tạo ra cảm giác FOMO (sợ bỏ lỡ) để thúc đẩy chuyển đổi nhanh chóng.",
    samplePosts: [
      "⏰ NHANH LÊN! Chỉ còn 24 giờ để tiết kiệm lên đến 70% cho các sản phẩm bán chạy nhất của chúng tôi! #KhuyếnMãiFlash",
      "Đừng bỏ lỡ! Khuyến mãi flash của chúng tôi kết thúc vào nửa đêm nay. Giảm giá sốc cho tất cả sản phẩm!",
      "GIẢM GIÁ SỐC chỉ trong hôm nay! Khi hết là hết - hãy nhanh tay đặt hàng ngay bây giờ! #CơHộiCuốiCùng",
    ],
    marketingGoals: ["Tăng doanh số nhanh chóng", "Giảm hàng tồn kho", "Tạo cảm giác khẩn cấp"],
    bestPractices: [
      "Sử dụng đồng hồ đếm ngược để tạo cảm giác khẩn cấp",
      "Nhấn mạnh vào tính giới hạn của ưu đãi (thời gian, số lượng)",
      "Sử dụng lời kêu gọi hành động mạnh mẽ và trực tiếp",
    ],
    performanceStats: {
      clickThroughRate: "9.3%",
      averageOrderValue: "850.000₫",
      returnOnAdSpend: "5.2x",
    },
  },
]

export default function TemplateDetailPage({ params }: { params: { id: string } }) {
  const templateId = Number.parseInt(params.id, 10)

  // Find the template
  const template = templates.find((t) => t.id === templateId)

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
