import type { CreatorGroup, GlobalMetrics, VideoItem } from "./types";
import { normalizeUsername } from "./format";

/**
 * Video hasil cache bisa berasal dari scan dengan hashtag target yang berbeda.
 * Status qualified/unqualified selalu dihitung ULANG di klien terhadap hashtag
 * yang aktif SEKARANG, supaya ganti hashtag lalu scan ulang tetap akurat tanpa
 * perlu fetch ulang ke TikTok. Status "error" (gagal fetch) tidak diubah.
 */
export function applyHashtagStatus(video: VideoItem, hashtagLower: string): VideoItem {
  if (video.status === "error") return video;
  const isQualified = video.title.toLowerCase().includes(`#${hashtagLower}`);
  return { ...video, status: isQualified ? "qualified" : "unqualified" };
}

/**
 * KPI ribbon dihitung dari SELURUH data (tidak terpengaruh search/filter aktif) —
 * ini "kebenaran" performa kampanye. "Total Campaign Views" & top creator/video
 * dihitung dari video yang QUALIFIED, karena itulah konten yang benar-benar
 * memenuhi syarat kampanye dan pantas dihitung sebagai performa kampanye.
 */
export function computeGlobalMetrics(allVideos: VideoItem[]): GlobalMetrics {
  const totalSubmitted = allVideos.length;
  const qualified = allVideos.filter((v) => v.status === "qualified");
  const unqualified = allVideos.filter((v) => v.status === "unqualified");
  const errored = allVideos.filter((v) => v.status === "error");

  const totalViews = qualified.reduce((acc, v) => acc + v.views, 0);

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
    totalCreators: creatorViewMap.size,
    topCreator,
    topVideo,
  };
}

/**
 * Kelompokkan video (yang sudah difilter oleh Toolbar) per username.
 * Dipakai oleh Folder View — jadi berubah mengikuti filter/search aktif.
 */
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
        videoCount: 0,
        qualifiedCount: 0,
        isTopCreator: false,
        videos: [],
      };
      map.set(key, group);
    }
    group.videos.push(v);
    group.videoCount += 1;
    group.totalViews += v.views;
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
