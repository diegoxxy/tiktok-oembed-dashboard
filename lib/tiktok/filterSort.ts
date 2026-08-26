import type { CreatorGroup, CreatorSortKey, PlatformFilter, StatusFilter, VideoItem, VideoSortKey } from "./types";

export interface ActiveFilters {
  search: string;
  status: StatusFilter;
  platform?: PlatformFilter;
  minViews: number | null;
}

export function filterVideos(videos: VideoItem[], filters: ActiveFilters): VideoItem[] {
  const search = (filters.search || "").trim().toLowerCase();

  return videos.filter((v) => {
    // 1. Filter Status
    if (filters.status && filters.status !== "all" && v.status !== filters.status) {
      return false;
    }

    // 2. Filter Platform (dengan fallback otomatis jika v.platform bernilai undefined)
    if (filters.platform && filters.platform !== "all") {
      const videoPlatform =
        v.platform ||
        (v.sourceUrl?.includes("youtube") || v.sourceUrl?.includes("youtu.be") ? "youtube" : "tiktok");

      if (videoPlatform !== filters.platform) {
        return false;
      }
    }

    // 3. Filter Minimum Views
    if (filters.minViews !== null && (v.views || 0) < filters.minViews) {
      return false;
    }

    // 4. Filter Pencarian Teks (Aman dari undefined/null)
    if (search) {
      const author = v.authorName || "";
      const id = v.id || "";
      const title = v.title || "";
      const haystack = `${author} ${id} ${title}`.toLowerCase();

      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });
}

export function sortVideos(videos: VideoItem[], key: VideoSortKey): VideoItem[] {
  const sorted = [...videos];
  sorted.sort((a, b) => (key === "views_desc" ? (b.views || 0) - (a.views || 0) : (a.views || 0) - (b.views || 0)));
  return sorted;
}

export function sortCreators(creators: CreatorGroup[], key: CreatorSortKey): CreatorGroup[] {
  const sorted = [...creators];
  switch (key) {
    case "creator_views_desc":
      sorted.sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));
      break;
    case "creator_views_asc":
      sorted.sort((a, b) => (a.totalViews || 0) - (b.totalViews || 0));
      break;
    case "creator_count_desc":
      sorted.sort((a, b) => (b.videoCount || 0) - (a.videoCount || 0));
      break;
    case "creator_alpha_asc":
      sorted.sort((a, b) => (a.authorName || "").localeCompare(b.authorName || ""));
      break;
  }
  return sorted;
}