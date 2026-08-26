export type Platform = "tiktok" | "youtube" | "instagram";
export type VideoStatus = "qualified" | "unqualified" | "error";

export interface VideoItem {
  id: string;
  platform: Platform; // Tambahan field platform
  sourceUrl: string;
  videoUrl: string;
  title: string;
  authorName: string;
  authorDisplayName: string;
  authorUrl: string;
  authorAvatar: string;
  coverUrl: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  postedAt: string;
  status: VideoStatus;
  errorMessage?: string;
}

export interface CreatorGroup {
  authorName: string;
  authorDisplayName: string;
  authorUrl: string;
  authorAvatar: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  videoCount: number;
  qualifiedCount: number;
  isTopCreator: boolean;
  videos: VideoItem[];
}

export interface GlobalMetrics {
  totalSubmitted: number;
  totalQualified: number;
  totalUnqualified: number;
  totalError: number;
  qualifiedRate: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalCreators: number;
  topCreator: { authorName: string; authorDisplayName: string; totalViews: number } | null;
  topVideo: { title: string; authorName: string; views: number; videoUrl: string } | null;
}

export interface AnalysisResult {
  hashtag: string;
  globalMetrics: GlobalMetrics;
  creators: CreatorGroup[];
  allVideos: VideoItem[];
}

export type StatusFilter = "all" | VideoStatus;
export type PlatformFilter = "all" | Platform; // Tambahan filter platform untuk UI
export type ViewMode = "folder" | "table";
export type VideoSortKey = "views_desc" | "views_asc";
export type CreatorSortKey =
  | "creator_views_desc"
  | "creator_views_asc"
  | "creator_count_desc"
  | "creator_alpha_asc";

export interface VideoBatchRequest {
  videoUrls: string[];
  targetHashtag: string;
}

export interface VideoBatchResponse {
  hashtag: string;
  videos: VideoItem[];
}