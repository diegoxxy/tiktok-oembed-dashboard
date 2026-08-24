import type { CreatorGroup, CreatorSortKey, StatusFilter, VideoItem, VideoSortKey } from "./types";

export interface ActiveFilters {
  search: string;
  status: StatusFilter;
  minViews: number | null;
}

export function filterVideos(videos: VideoItem[], filters: ActiveFilters): VideoItem[] {
  const search = filters.search.trim().toLowerCase();

  return videos.filter((v) => {
    if (filters.status !== "all" && v.status !== filters.status) return false;
    if (filters.minViews !== null && v.views < filters.minViews) return false;

    if (search) {
      const haystack = `${v.authorName} ${v.id} ${v.title}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

export function sortVideos(videos: VideoItem[], key: VideoSortKey): VideoItem[] {
  const sorted = [...videos];
  sorted.sort((a, b) => (key === "views_desc" ? b.views - a.views : a.views - b.views));
  return sorted;
}

export function sortCreators(creators: CreatorGroup[], key: CreatorSortKey): CreatorGroup[] {
  const sorted = [...creators];
  switch (key) {
    case "creator_views_desc":
      sorted.sort((a, b) => b.totalViews - a.totalViews);
      break;
    case "creator_views_asc":
      sorted.sort((a, b) => a.totalViews - b.totalViews);
      break;
    case "creator_count_desc":
      sorted.sort((a, b) => b.videoCount - a.videoCount);
      break;
    case "creator_alpha_asc":
      sorted.sort((a, b) => a.authorName.localeCompare(b.authorName));
      break;
  }
  return sorted;
}
