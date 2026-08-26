import type { CreatorGroup, GlobalMetrics, VideoItem } from "./types";
import { normalizeUsername } from "./format";

export function applyHashtagStatus(video: VideoItem, hashtagLower: string): VideoItem {
  if (video.status === "error") return video;
  const isQualified = video.title.toLowerCase().includes(`#${hashtagLower}`);
  return { ...video, status: isQualified ? "qualified" : "unqualified" };
}

export function computeGlobalMetrics(allVideos: VideoItem[]): GlobalMetrics {
  const totalSubmitted = allVideos.length;
  const qualified = allVideos.filter((v) => v.status === "qualified");
  const unqualified = allVideos.filter((v) => v.status === "unqualified");
  const errored = allVideos.filter((v) => v.status === "error");

  const totalViews = qualified.reduce((acc, v) => acc + (v.views || 0), 0);
  const totalLikes = qualified.reduce((acc, v) => acc + (v.likes || 0), 0);
  const totalComments = qualified.reduce((acc, v) => acc + (v.comments || 0), 0);
  const totalShares = qualified.reduce((acc, v) => acc + (v.shares || 0), 0);
  const totalSaves = qualified.reduce((acc, v) => acc + (v.saves || 0), 0);

  const creatorViewMap = new Map<string, { authorName: string; authorDisplayName: string; totalViews: number }>();
  for (const v of qualified) {
    const key = normalizeUsername(v.authorName);
    const existing = creatorViewMap.get(key);
    if (existing) {
      existing.totalViews += v.views;
    } else {
      creatorViewMap.set(key, {
        authorName: key,
        authorDisplayName: v.authorDisplayName || key,
        totalViews: v.views,
      });
    }
  }

  let topCreator: GlobalMetrics["topCreator"] = null;
  for (const c of creatorViewMap.values()) {
    if (!topCreator || c.totalViews > topCreator.totalViews) topCreator = c;
  }

  let topVideo: GlobalMetrics["topVideo"] = null;
  for (const v of qualified) {
    if (!topVideo || v.views > topVideo.views) {
      topVideo = { title: v.title, authorName: v.authorName, views: v.views, videoUrl: v.videoUrl };
    }
  }

  return {
    totalSubmitted,
    totalQualified: qualified.length,
    totalUnqualified: unqualified.length,
    totalError: errored.length,
    qualifiedRate: totalSubmitted > 0 ? (qualified.length / totalSubmitted) * 100 : 0,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
    totalCreators: creatorViewMap.size,
    topCreator,
    topVideo,
  };
}

export function groupVideosByCreator(videos: VideoItem[]): CreatorGroup[] {
  const map = new Map<string, CreatorGroup>();

  for (const v of videos) {
    const key = normalizeUsername(v.authorName);
    let group = map.get(key);
    if (!group) {
      group = {
        authorName: key,
        authorDisplayName: v.authorDisplayName || key,
        authorUrl: v.authorUrl,
        authorAvatar: v.authorAvatar,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalSaves: 0,
        videoCount: 0,
        qualifiedCount: 0,
        isTopCreator: false,
        videos: [],
      };
      map.set(key, group);
    }
    group.videos.push(v);
    group.videoCount += 1;
    group.totalViews += v.views || 0;
    group.totalLikes += v.likes || 0;
    group.totalComments += v.comments || 0;
    group.totalShares += v.shares || 0;
    group.totalSaves += v.saves || 0;

    if (v.status === "qualified") group.qualifiedCount += 1;
    if (!group.authorAvatar && v.authorAvatar) group.authorAvatar = v.authorAvatar;
  }

  const groups = Array.from(map.values());
  let top: CreatorGroup | null = null;
  for (const g of groups) {
    if (!top || g.totalViews > top.totalViews) top = g;
  }
  if (top) top.isTopCreator = true;

  return groups;
}