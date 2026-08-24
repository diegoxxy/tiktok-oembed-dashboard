export type VideoStatus = "qualified" | "unqualified" | "error";

export interface VideoItem {
  /** TikTok's own video id when known, otherwise the resolved URL */
  id: string;
  /** Original string the user submitted (import row / pasted line) */
  sourceUrl: string;
  /** Fully resolved desktop URL (shortlinks like vt.tiktok.com expanded) */
  videoUrl: string;
  title: string;
  authorName: string;
  authorDisplayName: string;
  authorUrl: string;
  authorAvatar: string;
  coverUrl: string;
  views: number;
  status: VideoStatus;
  errorMessage?: string;
}

export interface CreatorGroup {
  authorName: string;
  authorDisplayName: string;
  authorUrl: string;
  authorAvatar: string;
  totalViews: number;
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

export type ViewMode = "folder" | "table";

export type VideoSortKey = "views_desc" | "views_asc";

export type CreatorSortKey =
  | "creator_views_desc"
  | "creator_views_asc"
  | "creator_count_desc"
  | "creator_alpha_asc";

/** Request body sent to /api/tiktok — one chunk of URLs at a time. */
export interface TikTokBatchRequest {
  videoUrls: string[];
  targetHashtag: string;
}

export interface TikTokBatchResponse {
  hashtag: string;
  videos: VideoItem[];
}
