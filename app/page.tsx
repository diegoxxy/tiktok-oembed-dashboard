"use client";

import { useMemo, useState } from "react";
import type {
  CreatorSortKey,
  StatusFilter,
  TikTokBatchResponse,
  VideoItem,
  VideoSortKey,
  ViewMode,
} from "@/lib/tiktok/types";
import { chunkArray } from "@/lib/tiktok/chunk";
import { setManyInCache, clearCache } from "@/lib/tiktok/cache";
import { parseImportFile } from "@/lib/tiktok/importFile";
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
  return {
    id: sourceUrl,
    sourceUrl,
    videoUrl: sourceUrl,
    title: "",
    authorName: "unknown",
    authorDisplayName: "unknown",
    authorUrl: "",
    authorAvatar: "",
    coverUrl: "",
    views: 0,
    status: "error",
    errorMessage: message,
  };
}

export default function Home() {
  const [targetHashtag, setTargetHashtag] = useState("");
  const [urlsInput, setUrlsInput] = useState("");
  const [importInfo, setImportInfo] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [minViewsInput, setMinViewsInput] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("folder");
  const [videoSort, setVideoSort] = useState<VideoSortKey>("views_desc");
  const [creatorSort, setCreatorSort] = useState<CreatorSortKey>("creator_views_desc");
  const [selectedCreatorName, setSelectedCreatorName] = useState<string | null>(null);

  async function handleImportFile(file: File) {
    try {
      const result = await parseImportFile(file);
      const urls = Array.isArray(result) ? result : (result as any).urls || [];
      
      if (urls.length === 0) {
        setImportInfo(`Tidak ada URL TikTok yang ditemukan di file "${file.name}".`);
        return;
      }
      const existing = parseUrlsFromText(urlsInput);
      const existingSet = new Set(existing);
      const newOnes = urls.filter((u: string) => !existingSet.has(u));
      const merged = [...existing, ...newOnes];
      setUrlsInput(merged.join("\n"));
      setImportInfo(
        `Ditemukan ${urls.length} URL dari "${file.name}" (${newOnes.length} baru ditambahkan).`
      );
    } catch {
      setImportInfo(`Gagal membaca file "${file.name}". Pastikan formatnya .xlsx, .xls, atau .csv.`);
    }
  }

  async function handleScan() {
    if (!targetHashtag.trim() || !urlsInput.trim()) return;

    setLoading(true);
    setError("");
    setAllVideos([]);
    
    const cleanHashtag = targetHashtag.replace(/^#/, "").trim();
    const urls = parseUrlsFromText(urlsInput);

    const chunks = chunkArray(urls, 10);
    const toCache: any[] = [];

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
          throw new Error((data as any).error || "Request batch gagal");
        }

        if (data.videos) {
          setAllVideos((prev) => [...prev, ...data.videos]);
          toCache.push(...data.videos.map((v) => ({ sourceUrl: v.sourceUrl, video: v })));
        }
      } catch (err) {
        const errored = chunk.map((u) => makeErrorVideo(u, "Gagal menghubungi server"));
        setAllVideos((prev) => [...prev, ...errored]);
      }

      setProgress((prev) => (prev ? { ...prev, done: Math.min(prev.total, prev.done + chunk.length) } : null));
    }

    if (toCache.length > 0) {
      await setManyInCache(toCache);
    }

    setLoading(false);
  }

  async function handleClearCache() {
    await clearCache();
    setImportInfo("Cache lokal dibersihkan.");
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
        {/* Header / Branding */}
        <header className="border-b border-[#1e293b] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 text-cyan-400">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Bola Mata Currency Analytics
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              TikTok Campaign Analytics Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Verifikasi, agregasi, dan analisis performa kampanye — siap untuk 1.000+ link.
            </p>
          </div>
        </header>

        <InputPanel
          targetHashtag={targetHashtag}
          setTargetHashtag={setTargetHashtag}
          onHashtagChange={setTargetHashtag}
          rawUrls={urlsInput}
          setRawUrls={setUrlsInput}
          onRawUrlsChange={setUrlsInput}
          onAnalyze={handleScan}
          isLoading={loading}
          onImportSuccess={(urls) => {
            const existing = parseUrlsFromText(urlsInput);
            const combined = Array.from(new Set([...existing, ...urls]));
            setUrlsInput(combined.join("\n"));
          }}
        />

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
              <FolderView creators={creatorsForFolder} onSelectCreator={setSelectedCreatorName} />
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