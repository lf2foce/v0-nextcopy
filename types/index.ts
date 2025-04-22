// Campaign related types
export type Campaign = {
  id?: number
  name: string
  description: string
  target: string
  insight?: string
  repeatEveryDays: number
  startDate: Date
  currentStep?: number
  title?: string
  targetCustomer?: string
}

// Theme related types
export type Theme = {
  id: string | number
  name?: string
  description?: string
  campaignId?: number
  isSelected?: boolean
  title?: string
  story?: string
  tags?: string[]
}

// Image related types
export type ImageData = {
  url: string
  isSelected?: boolean
  metadata?: {
    style?: string
    [key: string]: any
  }
}

export type ImagesData = {
  images: ImageData[]
}

// Post related types
export type Post = {
  id: string | number
  content: string
  image?: string
  imageUrl?: string
  videoUrl?: string
  imageGenerated?: boolean
  videoGenerated?: boolean
  campaignId?: number
  themeId?: number
  isApproved?: boolean
  isScheduled?: boolean
  title?: string
  status?: 'draft' | 'scheduled' | 'posted' | 'failed'
  images?: string      // JSON string containing image data
  imagesJson?: string  // Alternative name for images data
  defaultImageIndex?: number
  image_status?: 'pending' | 'generated' | 'failed'
  scheduledDate?: Date | string
  postedAt?: Date | string
  feedback?: string
}

// Component Props types
export interface ReviewPostsProps {
  posts: Post[]
  onComplete: (posts: Post[]) => void
  onBack: () => void
}

export interface PostModalProps {
  post: Post
  isOpen: boolean
  onClose: () => void
}

export interface VideoModalProps {
  videoUrl: string
  isOpen: boolean
  onClose: () => void
}

// Campaign Workflow types
export interface CampaignWorkflowProps {
  initialCampaign?: Campaign
  initialStep?: number
  initialData?: {
    campaign?: Campaign
    themes?: Theme[]
    selectedTheme?: Theme
    posts?: Post[]
    selectedPosts?: Post[]
    postsWithImages?: Post[]
    postsWithVideos?: Post[]
  }
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Database types
export interface DatabasePost extends Omit<Post, 'images' | 'imagesJson'> {
  images: string
  imagesJson: string
}

export interface DatabaseTheme extends Omit<Theme, 'id'> {
  id: number
}

export interface DatabaseCampaign extends Omit<Campaign, 'id'> {
  id: number
} 