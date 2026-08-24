"use client";

import type { CreatorSortKey, StatusFilter, VideoSortKey, ViewMode } from "@/lib/tiktok/types";
import { Search, LayoutGrid, Table2, FileSpreadsheet, FileText } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
  minViews: string;
  onMinViewsChange: (v: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  videoSort: VideoSortKey;
  onVideoSortChange: (v: VideoSortKey) => void;
  creatorSort: CreatorSortKey;
  onCreatorSortChange: (v: CreatorSortKey) => void;
  shownCount: number;
  totalCount: number;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export default function Toolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  minViews,
  onMinViewsChange,
  viewMode,
  onViewModeChange,
  videoSort,
  onVideoSortChange,
  creatorSort,
  onCreatorSortChange,
  shownCount,
  totalCount,
  onExportExcel,
  onExportPdf,
}: Props) {
  return (
    <div className="bg-[#131b2e] border border-[#1e293b] rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari @username, ID video, atau caption..."
            className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
          className="bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="all">Semua Status</option>
          <option value="qualified">Qualified</option>
          <option value="unqualified">Unqualified</option>
          <option value="error">Error/Private</option>
        </select>

        {/* Min views */}
        <input
          type="number"
          min={0}
          value={minViews}
          onChange={(e) => onMinViewsChange(e.target.value)}
          placeholder="Min. views"
          className="w-32 bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
        />

        {/* Sort — context sensitive by view mode */}
        {viewMode === "table" ? (
          <select
            value={videoSort}
            onChange={(e) => onVideoSortChange(e.target.value as VideoSortKey)}
            className="bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="views_desc">Views: Terbanyak</option>
            <option value="views_asc">Views: Tersedikit</option>
          </select>
        ) : (
          <select
            value={creatorSort}
            onChange={(e) => onCreatorSortChange(e.target.value as CreatorSortKey)}
            className="bg-[#0b0f19] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="creator_views_desc">Kreator: Views Terbanyak</option>
            <option value="creator_views_asc">Kreator: Views Tersedikit</option>
            <option value="creator_count_desc">Kreator: Video Terbanyak</option>
            <option value="creator_alpha_asc">Kreator: A-Z</option>
          </select>
        )}

        {/* View mode toggle */}
        <div className="flex bg-[#0b0f19] border border-slate-700 rounded-lg p-1">
          <button
            type="button"
            onClick={() => onViewModeChange("folder")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "folder" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Folder
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "table" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Table2 className="w-3.5 h-3.5" /> Table
          </button>
        </div>

        {/* Export */}
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 hover:border-emerald-700 bg-emerald-950/20 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700 bg-red-950/20 px-3 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        Menampilkan {shownCount.toLocaleString("id-ID")} dari {totalCount.toLocaleString("id-ID")} video
      </p>
    </div>
  );
}
