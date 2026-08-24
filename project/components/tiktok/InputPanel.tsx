"use client";

import { useRef } from "react";
import { Loader2, UploadCloud, PlayCircle } from "lucide-react";

interface Props {
  targetHashtag: string;
  onHashtagChange: (v: string) => void;
  urlsInput: string;
  onUrlsInputChange: (v: string) => void;
  onImportFile: (file: File) => void;
  onScan: () => void;
  loading: boolean;
  progress: { done: number; total: number } | null;
  error: string;
  importInfo: string;
  forceRefresh: boolean;
  onForceRefreshChange: (v: boolean) => void;
  onClearCache: () => void;
}

export default function InputPanel({
  targetHashtag,
  onHashtagChange,
  urlsInput,
  onUrlsInputChange,
  onImportFile,
  onScan,
  loading,
  progress,
  error,
  importInfo,
  forceRefresh,
  onForceRefreshChange,
  onClearCache,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressPct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="bg-[#131b2e] border border-[#1e293b] rounded-xl p-6 shadow-xl space-y-5">
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Hashtag Syarat Kampanye
        </label>
        <input
          type="text"
          value={targetHashtag}
          onChange={(e) => onHashtagChange(e.target.value)}
          placeholder="Contoh: BertamuSpecial"
          className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Daftar Link Video TikTok (1 URL per baris)
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 border border-cyan-900/50 hover:border-cyan-700 bg-cyan-950/20 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Import Excel / CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
        <textarea
          rows={5}
          value={urlsInput}
          onChange={(e) => onUrlsInputChange(e.target.value)}
          placeholder="https://www.tiktok.com/@username/video/123456789"
          className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-4 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
        />
        {importInfo && <p className="text-xs text-slate-500">{importInfo}</p>}

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => onForceRefreshChange(e.target.checked)}
              className="accent-cyan-500"
            />
            Abaikan cache (ambil data views terbaru)
          </label>
          <button
            type="button"
            onClick={onClearCache}
            className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2 cursor-pointer"
          >
            Hapus cache lokal
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg">{error}</div>
      )}

      <button
        onClick={onScan}
        disabled={loading}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {progress
              ? `Memproses ${progress.done} / ${progress.total} video... (${progressPct}%)`
              : "Memproses Data TikTok..."}
          </>
        ) : (
          <>
            <PlayCircle className="w-5 h-5" />
            Verifikasi & Kelompokkan Per Username
          </>
        )}
      </button>

      {loading && progress && (
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
