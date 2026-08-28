"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import type {
  CreatorSortKey,
  StatusFilter,
  VideoBatchResponse,
  VideoItem,
  VideoSortKey,
  ViewMode,
} from "@/lib/tiktok/types";
import { chunkArray } from "@/lib/tiktok/chunk";
import { setManyInCache } from "@/lib/tiktok/cache";
import { exportResultToExcel } from "@/lib/tiktok/exportExcel";
import { exportResultToPdf } from "@/lib/tiktok/exportPdf";
import { computeGlobalMetrics, groupVideosByCreator } from "@/lib/tiktok/aggregate";
import { filterVideos, sortCreators, sortVideos } from "@/lib/tiktok/filterSort";
import { fetchInstagramDataClient } from "@/lib/tiktok/client/fetchInstagramClient";

import InputPanel from "@/components/tiktok/InputPanel";
import KpiRibbon from "@/components/tiktok/KpiRibbon";
import Toolbar from "@/components/tiktok/Toolbar";
import FolderView from "@/components/tiktok/FolderView";
import MasterTable from "@/components/tiktok/MasterTable";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseUrlsFromText(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    urls.push(trimmed);
  }
  return urls;
}

function makeErrorVideo(sourceUrl: string, message: string): VideoItem {
  const isYouTube = sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be");
  const isInstagram = sourceUrl.includes("instagram.com");

  let platform: "youtube" | "tiktok" | "instagram" = "tiktok";
  if (isYouTube) platform = "youtube";
  if (isInstagram) platform = "instagram";

  return {
    id: sourceUrl,
    platform,
    sourceUrl,
    videoUrl: sourceUrl,
    title: isInstagram ? "Instagram Reel (Sistem Membutuhkan Input Manual)" : "Gagal Memuat Video",
    authorName: isInstagram ? "instagram_creator" : "unknown",
    authorDisplayName: isInstagram ? "Instagram Creator (Manual Input)" : "Unknown / Error",
    authorUrl: sourceUrl,
    authorAvatar: "",
    coverUrl: "",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "-",
    status: "qualified",
    errorMessage: message,
  };
}

export default function Home() {
  const [targetHashtag, setTargetHashtag] = useState("");
  const [urlsInput, setUrlsInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minViewsInput, setMinViewsInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("folder");
  const [videoSort, setVideoSort] = useState<VideoSortKey>("views_desc");
  const [creatorSort, setCreatorSort] = useState<CreatorSortKey>("creator_views_desc");

  useEffect(() => {
    const cachedVideos = localStorage.getItem("tiktok_analytics_last_scan");

    if (cachedVideos) {
      try {
        const parsed = JSON.parse(cachedVideos);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllVideos(parsed);
        }
      } catch (e) {
        console.error("Gagal memuat cache dashboard:", e);
      }
    }
  }, []);

  const enrichInstagramVideo = useCallback(
    async (v: VideoItem, cleanHashtag: string): Promise<VideoItem> => {
      const isInstagramLink =
        v.sourceUrl.includes("instagram.com") || v.platform === "instagram";

      if (isInstagramLink) {
        const clientData = await fetchInstagramDataClient(v.sourceUrl);
        if (clientData && clientData.username) {
          const cleanUsername = clientData.username.toLowerCase().trim();
          const captionText = clientData.caption || v.title;
          
          const hasHashtag = cleanHashtag
            ? captionText.toLowerCase().includes(`#${cleanHashtag}`)
            : true;

          return {
            ...v,
            platform: "instagram",
            authorName: cleanUsername,
            authorDisplayName:
              cleanUsername === "instagram_creator"
                ? "Instagram Creator (Perlu Input Manual)"
                : `@${cleanUsername}`,
            authorUrl:
              cleanUsername === "instagram_creator"
                ? v.sourceUrl
                : `https://www.instagram.com/${cleanUsername}`,
            title: captionText,
            views: clientData.views || v.views,
            likes: clientData.likes || v.likes,
            comments: clientData.comments || v.comments,
            coverUrl: clientData.thumbnail || v.coverUrl,
            status: "qualified",
            errorMessage: undefined,
          };
        }
      }
      return v;
    },
    []
  );

  async function handleScan() {
    if (!targetHashtag.trim() || !urlsInput.trim()) return;

    setLoading(true);
    setAllVideos([]);

    const cleanHashtag = targetHashtag.replace(/^#/, "").trim().toLowerCase();
    const urls = parseUrlsFromText(urlsInput);

    const chunks = chunkArray(urls, 5);
    const toCache: { sourceUrl: string; video: VideoItem }[] = [];
    const collectedVideos: VideoItem[] = [];

    setProgress({ done: 0, total: urls.length });

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];

      if (chunkIndex > 0) {
        await delay(1500);
      }

      try {
        const res = await fetch("/api/tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrls: chunk, targetHashtag: cleanHashtag }),
        });

        const data = (await res.json()) as VideoBatchResponse;

        if (!res.ok) {
          throw new Error((data as unknown as { error?: string }).error || "Request batch gagal");
        }

        if (data.videos) {
          const processedVideos = await Promise.all(
            data.videos.map((v: VideoItem) => enrichInstagramVideo(v, cleanHashtag))
          );

          setAllVideos((prev) => [...prev, ...processedVideos]);
          collectedVideos.push(...processedVideos);
          toCache.push(
            ...processedVideos.map((v: VideoItem) => ({ sourceUrl: v.sourceUrl, video: v }))
          );
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Gagal menghubungi server";

        const errored = await Promise.all(
          chunk.map(async (u: string) => {
            const fallbackVideo = makeErrorVideo(u, errorMessage);
            return await enrichInstagramVideo(fallbackVideo, cleanHashtag);
          })
        );

        setAllVideos((prev) => [...prev, ...errored]);
        collectedVideos.push(...errored);
        toCache.push(
          ...errored.map((v: VideoItem) => ({ sourceUrl: v.sourceUrl, video: v }))
        );
      }

      setProgress((prev) =>
        prev ? { ...prev, done: Math.min(prev.total, prev.done + chunk.length) } : null
      );
    }

    if (toCache.length > 0) {
      await setManyInCache(toCache);
    }

    localStorage.setItem("tiktok_analytics_last_scan", JSON.stringify(collectedVideos));

    setLoading(false);
    setProgress(null);
  }

  function handleReset() {
    setAllVideos([]);
    setTargetHashtag("");
    setUrlsInput("");
    localStorage.removeItem("tiktok_analytics_last_scan");
  }

  const globalMetrics = useMemo(() => computeGlobalMetrics(allVideos), [allVideos]);

  const filters = useMemo(
    () => ({
      search,
      status,
      minViews: minViewsInput.trim() === "" ? null : Number(minViewsInput),
    }),
    [search, status, minViewsInput]
  );

  const filteredVideos = useMemo(() => filterVideos(allVideos, filters), [allVideos, filters]);

  const sortedVideosForTable = useMemo(
    () => sortVideos(filteredVideos, videoSort),
    [filteredVideos, videoSort]
  );

  const creatorsForFolder = useMemo(() => {
    const grouped = groupVideosByCreator(filteredVideos);
    const sorted = sortCreators(grouped, creatorSort);

    const unknownGroup = grouped.find(
      (c) => c.authorName.toLowerCase() === "unknown"
    );

    const validCreators = sorted.filter(
      (c) => c.authorName.toLowerCase() !== "unknown"
    );

    if (unknownGroup) {
      return [
        {
          ...unknownGroup,
          authorDisplayName: "⚠️ Link Error / Unknown",
        },
        ...validCreators,
      ];
    }

    return validCreators;
  }, [filteredVideos, creatorSort]);

  const hasResult = allVideos.length > 0;
  const manualCount = useMemo(
    () =>
      allVideos.filter(
        (v: VideoItem) => v.authorName.toLowerCase() === "instagram_creator" || v.views === 0
      ).length,
    [allVideos]
  );

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="border-b border-[#1e293b] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Bola Mata Currency Analytics
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              TikTok, YouTube & Instagram Campaign Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Verifikasi, agregasi, dan analisis performa kampanye multi-platform.
            </p>
          </div>
          {hasResult && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors self-start md:self-auto"
            >
              Reset / Analisis Baru
            </button>
          )}
        </header>

        <InputPanel
          targetHashtag={targetHashtag}
          onHashtagChange={setTargetHashtag}
          rawUrls={urlsInput}
          onRawUrlsChange={setUrlsInput}
          onAnalyze={handleScan}
          isLoading={loading}
          onImportSuccess={(urls: string[]) => {
            const existing = parseUrlsFromText(urlsInput);
            const combined = Array.from(new Set([...existing, ...urls]));
            setUrlsInput(combined.join("\n"));
          }}
        />

        {loading && progress && (
          <div className="text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-800/50 p-3 rounded-lg flex justify-between items-center">
            <span>Memproses analisis link...</span>
            <span className="font-mono font-bold">
              {progress.done} / {progress.total} link
            </span>
          </div>
        )}

        {hasResult && (
          <div className="space-y-6 animate-fadeIn">
            {manualCount > 0 && (
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-300 text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <strong className="font-semibold text-cyan-200">Catatan Instagram:</strong> Ditemukan{" "}
                  <span className="font-bold underline">{manualCount} link Instagram</span> yang terkena proteksi scraping publik. Anda dapat mengeklik link asli untuk mengecek views/likes manual jika diperlukan.
                </div>
              </div>
            )}

            <KpiRibbon
              metrics={globalMetrics}
              hashtag={`#${targetHashtag.toLowerCase().replace("#", "").trim()}`}
            />

            <Toolbar
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              minViews={minViewsInput}
              onMinViewsChange={setMinViewsInput}
              viewMode={viewMode}
              onViewModeChange={(mode) => setViewMode(mode)}
              videoSort={videoSort}
              onVideoSortChange={setVideoSort}
              creatorSort={creatorSort}
              onCreatorSortChange={setCreatorSort}
              shownCount={filteredVideos.length}
              totalCount={allVideos.length}
              onExportExcel={() =>
                exportResultToExcel({
                  hashtag: `#${targetHashtag.toLowerCase().replace("#", "").trim()}`,
                  globalMetrics,
                  creators: creatorsForFolder,
                  allVideos,
                })
              }
              onExportPdf={() =>
                exportResultToPdf({
                  hashtag: `#${targetHashtag.toLowerCase().replace("#", "").trim()}`,
                  globalMetrics,
                  creators: creatorsForFolder,
                  allVideos,
                })
              }
            />

            {viewMode === "folder" ? (
              <FolderView creators={creatorsForFolder} />
            ) : (
              <MasterTable videos={sortedVideosForTable} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}