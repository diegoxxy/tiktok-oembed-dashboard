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
import { chunkArray, runChunksWithConcurrency } from "@/lib/tiktok/chunk";
import { getManyFromCache, setManyInCache, clearCache } from "@/lib/tiktok/cache";
import { parseImportFile } from "@/lib/tiktok/importFile";
import { exportResultToExcel } from "@/lib/tiktok/exportExcel";
import { exportResultToPdf } from "@/lib/tiktok/exportPdf";
import { applyHashtagStatus, computeGlobalMetrics, groupVideosByCreator } from "@/lib/tiktok/aggregate";
import { filterVideos, sortCreators, sortVideos } from "@/lib/tiktok/filterSort";

import InputPanel from "@/components/tiktok/InputPanel";
import KpiRibbon from "@/components/tiktok/KpiRibbon";
import Toolbar from "@/components/tiktok/Toolbar";
import FolderView from "@/components/tiktok/FolderView";
import MasterTable from "@/components/tiktok/MasterTable";
import CreatorDrawer from "@/components/tiktok/CreatorDrawer";

// Ukuran per-chunk yang dikirim ke /api/tiktok, dan berapa chunk yang boleh
// berjalan bersamaan. Diseimbangkan supaya cepat untuk 1.000+ link tanpa
// terlalu agresif membombardir TikWM/TikTok (berisiko rate-limit).
const CHUNK_SIZE = 12;
const CONCURRENCY = 3;

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
      if (result.urls.length === 0) {
        setImportInfo(`Tidak ada URL TikTok yang ditemukan di file "${file.name}".`);
        return;
      }
      const existing = parseUrlsFromText(urlsInput);
      const existingSet = new Set(existing);
      const newOnes = result.urls.filter((u) => !existingSet.has(u));
      const merged = [...existing, ...newOnes];
      setUrlsInput(merged.join("\n"));
      setImportInfo(
        `Ditemukan ${result.urls.length} URL dari "${file.name}" (${newOnes.length} baru ditambahkan, ${
          result.urls.length - newOnes.length
        } sudah ada di daftar).`
      );
    } catch {
      setImportInfo(`Gagal membaca file "${file.name}". Pastikan formatnya .xlsx, .xls, atau .csv.`);
    }
  }

  async function handleScan() {
    setError("");
    setSelectedCreatorName(null);

    const urls = parseUrlsFromText(urlsInput);
    const cleanHashtag = targetHashtag.toLowerCase().replace("#", "").trim();

    if (urls.length === 0) {
      setError("Harap masukkan minimal 1 URL video TikTok (paste manual atau import Excel/CSV).");
      return;
    }
    if (!cleanHashtag) {
      setError("Hashtag target tidak boleh kosong.");
      return;
    }

    setLoading(true);
    setProgress({ done: 0, total: urls.length });

    const resultsMap = new Map<string, VideoItem>();
    const toCache: { sourceUrl: string; video: VideoItem }[] = [];

    function pushResults(entries: VideoItem[], sourceUrls: string[]) {
      entries.forEach((v, i) => {
        const key = sourceUrls[i] ?? v.sourceUrl;
        resultsMap.set(key, applyHashtagStatus(v, cleanHashtag));
      });
      setAllVideos(urls.map((u) => resultsMap.get(u)).filter((v): v is VideoItem => Boolean(v)));
    }

    let urlsToFetch = urls;

    if (!forceRefresh) {
      const cached = await getManyFromCache(urls);
      if (cached.size > 0) {
        const cachedEntries = urls.filter((u) => cached.has(u)).map((u) => cached.get(u) as VideoItem);
        const cachedSourceUrls = urls.filter((u) => cached.has(u));
        pushResults(cachedEntries, cachedSourceUrls);
        setProgress({ done: cached.size, total: urls.length });
      }
      urlsToFetch = urls.filter((u) => !cached.has(u));
    }

    const chunks = chunkArray(urlsToFetch, CHUNK_SIZE);

    await runChunksWithConcurrency(
      chunks,
      CONCURRENCY,
      async (chunk) => {
        const res = await fetch("/api/tiktok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrls: chunk, targetHashtag: cleanHashtag }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Request batch gagal");
        }
        const data = (await res.json()) as TikTokBatchResponse;
        return data.videos;
      },
      (videos, chunkIndex) => {
        const chunk = chunks[chunkIndex];
        if (videos) {
          pushResults(videos, chunk);
          toCache.push(...videos.map((v) => ({ sourceUrl: v.sourceUrl, video: v })));
        } else {
          // Chunk gagal total (mis. masalah jaringan) — tandai error, jangan hilang diam-diam.
          const errored = chunk.map((u) => makeErrorVideo(u, "Gagal menghubungi server"));
          pushResults(errored, chunk);
        }
        setProgress((prev) => (prev ? { ...prev, done: Math.min(prev.total, prev.done + chunk.length) } : prev));
      }
    );

    if (toCache.length > 0) await setManyInCache(toCache);

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

  // Drawer selalu menampilkan profil kreator LENGKAP (semua video, semua status),
  // tidak ikut menyempit ketika filter Toolbar berubah setelah drawer dibuka.
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
          onHashtagChange={setTargetHashtag}
          urlsInput={urlsInput}
          onUrlsInputChange={setUrlsInput}
          onImportFile={handleImportFile}
          onScan={handleScan}
          loading={loading}
          progress={progress}
          error={error}
          importInfo={importInfo}
          forceRefresh={forceRefresh}
          onForceRefreshChange={setForceRefresh}
          onClearCache={handleClearCache}
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
