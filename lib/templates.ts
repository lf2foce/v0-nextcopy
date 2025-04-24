// Template data and utility functions

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
  // Other templates...
]

// Get all templates
export async function getAllTemplates() {
  return templates
}

// Get template by ID
export async function getTemplateById(id: number) {
  return templates.find((template) => template.id === id)
}
