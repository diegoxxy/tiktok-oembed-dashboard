"use client";

import { useMemo, useState, useEffect } from "react";
import type {
  CreatorSortKey,
  StatusFilter,
  TikTokBatchResponse,
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

import InputPanel from "@/components/tiktok/InputPanel";
import KpiRibbon from "@/components/tiktok/KpiRibbon";
import Toolbar from "@/components/tiktok/Toolbar";
import FolderView from "@/components/tiktok/FolderView";
import MasterTable from "@/components/tiktok/MasterTable";
import CreatorDrawer from "@/components/tiktok/CreatorDrawer";

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
  return {
    id: sourceUrl,
    platform: isYouTube ? "youtube" : "tiktok",
    sourceUrl,
    videoUrl: sourceUrl,
    title: "Gagal Memuat Video",
    authorName: "unknown",
    authorDisplayName: "unknown",
    authorUrl: "",
    authorAvatar: "",
    coverUrl: "",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "-",
    status: "error",
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
  const [selectedCreatorName, setSelectedCreatorName] = useState<string | null>(null);

  // Load hanya hasil scan terakhir (jika ada), TANPA auto-fill form input hashtag/URL
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

  async function handleScan() {
    if (!targetHashtag.trim() || !urlsInput.trim()) return;

    setLoading(true);
    setAllVideos([]);

    const cleanHashtag = targetHashtag.replace(/^#/, "").trim();
    const urls = parseUrlsFromText(urlsInput);

    const chunks = chunkArray(urls, 10);
    const toCache: { sourceUrl: string; video: VideoItem }[] = [];
    const collectedVideos: VideoItem[] = [];

    setProgress({ done: 0, total: urls.length });

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      try {
        const res = await fetch("/api/tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrls: chunk, targetHashtag: cleanHashtag }),
        });

        const data = (await res.json()) as TikTokBatchResponse;

        if (!res.ok) {
          throw new Error((data as unknown as { error?: string }).error || "Request batch gagal");
        }

        if (data.videos) {
          setAllVideos((prev) => [...prev, ...data.videos]);
          collectedVideos.push(...data.videos);
          toCache.push(...data.videos.map((v) => ({ sourceUrl: v.sourceUrl, video: v })));
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Gagal menghubungi server";
        const errored = chunk.map((u: string) => makeErrorVideo(u, errorMessage));
        setAllVideos((prev) => [...prev, ...errored]);
        collectedVideos.push(...errored);
      }

      setProgress((prev) => (prev ? { ...prev, done: Math.min(prev.total, prev.done + chunk.length) } : null));
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
    localStorage.removeItem("tiktok_analytics_last_hashtag");
    localStorage.removeItem("tiktok_analytics_last_urls");
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

  const creatorsForFolder = useMemo(
    () => sortCreators(groupVideosByCreator(filteredVideos), creatorSort),
    [filteredVideos, creatorSort]
  );

  const allCreatorsUnfiltered = useMemo(() => groupVideosByCreator(allVideos), [allVideos]);
  const selectedCreator = useMemo(
    () => allCreatorsUnfiltered.find((c) => c.authorName === selectedCreatorName) ?? null,
    [allCreatorsUnfiltered, selectedCreatorName]
  );

  const hasResult = allVideos.length > 0;

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
              TikTok & YouTube Campaign Analytics Dashboard
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
              Reset / Reset Analisis
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
            <span className="font-mono font-bold">{progress.done} / {progress.total} link</span>
          </div>
        )}

        {hasResult && (
          <div className="space-y-6 animate-fadeIn">
            <KpiRibbon metrics={globalMetrics} hashtag={`#${targetHashtag.toLowerCase().replace("#", "").trim()}`} />

            <Toolbar
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              minViews={minViewsInput}
              onMinViewsChange={setMinViewsInput}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
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
              <FolderView creators={creatorsForFolder} onOpenCreatorDrawer={setSelectedCreatorName} />
            ) : (
              <MasterTable videos={sortedVideosForTable} />
            )}
          </div>
        )}
      </div>

      <CreatorDrawer creator={selectedCreator} onClose={() => setSelectedCreatorName(null)} />
    </main>
  );
}