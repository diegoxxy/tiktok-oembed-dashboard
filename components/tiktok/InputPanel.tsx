"use client";

import React, { useRef } from "react";
import { Upload, Play } from "lucide-react";
import { parseImportFile } from "@/lib/tiktok/importFile";

interface InputPanelProps {
  hashtag?: string;
  setHashtag?: (val: string) => void;
  onHashtagChange?: (val: string) => void;
  rawUrls?: string;
  setRawUrls?: (val: string) => void;
  onRawUrlsChange?: (val: string) => void;
  isLoading?: boolean;
  onAnalyze?: () => void;
  onImportSuccess?: (urls: string[]) => void;
  // Fallback opsional untuk me-bypass prop cache lama dari page.tsx
  useCache?: boolean;
  setUseCache?: (val: boolean) => void;
  onUseCacheChange?: (val: boolean) => void;
}

export const InputPanel: React.FC<InputPanelProps> = ({
  hashtag = "",
  setHashtag,
  onHashtagChange,
  rawUrls = "",
  setRawUrls,
  onRawUrlsChange,
  isLoading = false,
  onAnalyze,
  onImportSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper untuk update hashtag secara aman tanpa peduli nama prop yang dikirim page.tsx
  const handleHashtagChange = (val: string) => {
    if (setHashtag) setHashtag(val);
    if (onHashtagChange) onHashtagChange(val);
  };

  // Helper untuk update rawUrls secara aman
  const handleUrlsChange = (val: string) => {
    if (setRawUrls) setRawUrls(val);
    if (onRawUrlsChange) onRawUrlsChange(val);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const extractedUrls = await parseImportFile(file);
      if (extractedUrls.length === 0) {
        alert("Tidak ditemukan URL TikTok valid dalam file tersebut.");
        return;
      }

      const existingUrls = rawUrls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

      const combined = Array.from(new Set([...existingUrls, ...extractedUrls]));
      handleUrlsChange(combined.join("\n"));

      if (onImportSuccess) {
        onImportSuccess(extractedUrls);
      }
    } catch {
      alert("Gagal membaca file. Pastikan format file adalah .xlsx atau .csv");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-[#131B2E] border border-[#1E293B] rounded-xl p-6 shadow-xl mb-8 space-y-6">
      {/* Input Hashtag */}
      <div>
        <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">
          Hashtag Syarat Kampanye
        </label>
        <input
          type="text"
          value={hashtag}
          onChange={(e) => handleHashtagChange(e.target.value)}
          placeholder="Contoh: BertamuSpecial"
          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {/* Input Textarea & Import File Button */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase">
            Daftar Link Video TikTok (1 URL Per Baris)
          </label>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 hover:border-cyan-500/50 px-3 py-1.5 rounded-lg transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Excel / CSV
            </button>
          </div>
        </div>
        <textarea
          rows={6}
          value={rawUrls}
          onChange={(e) => handleUrlsChange(e.target.value)}
          placeholder="https://www.tiktok.com/@username/video/123456789&#10;https://vt.tiktok.com/ZSXXXXXX/"
          className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg p-4 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors resize-y"
        />
      </div>

      {/* Submit Button */}
      <button
        type="button"
        disabled={isLoading || !hashtag || !rawUrls.trim()}
        onClick={onAnalyze}
        className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/50"
      >
        <Play className="w-4 h-4 fill-current" />
        {isLoading ? "Memproses Data Real-Time..." : "Verifikasi & Kelompokkan Per Username"}
      </button>
    </div>
  );
};

export default InputPanel;