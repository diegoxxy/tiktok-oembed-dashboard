"use client";

import { useEffect } from "react";
import type { CreatorGroup } from "@/lib/tiktok/types";
import { formatFullNumber } from "@/lib/tiktok/format";
import { X, ExternalLink } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { CreatorAvatar } from "./FolderView";

export default function CreatorDrawer({
  creator,
  onClose,
}: {
  creator: CreatorGroup | null;
  onClose: () => void;
}) {
  const isOpen = creator !== null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden={!isOpen}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[#131b2e] border-l border-[#1e293b] z-50 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {creator && (
          <>
            <div className="flex items-center justify-between p-5 border-b border-[#1e293b]">
              <div className="flex items-center gap-3 min-w-0">
                <CreatorAvatar name={creator.authorName} avatarUrl={creator.authorAvatar} />
                <div className="min-w-0">
                  <a
                    href={creator.authorUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-base font-bold text-cyan-400 hover:underline truncate flex items-center gap-1"
                  >
                    @{creator.authorName}
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                  </a>
                  <p className="text-xs text-slate-500">
                    {creator.videoCount} video · {formatFullNumber(creator.totalViews)} views
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto enterprise-scroll p-5 space-y-3">
              {creator.videos.map((vid) => (
                <div
                  key={vid.id}
                  className="bg-[#0b0f19] border border-slate-800 rounded-lg p-3 flex gap-3 hover:border-slate-700 transition-colors"
                >
                  {vid.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={vid.coverUrl}
                      alt="Cover"
                      className="w-16 h-24 object-cover rounded-md border border-slate-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-24 rounded-md border border-slate-800 flex-shrink-0 bg-slate-900" />
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {vid.title || <span className="italic text-slate-600">(tanpa caption)</span>}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-medium text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded">
                          {formatFullNumber(vid.views)} views
                        </span>
                        <StatusBadge status={vid.status} />
                      </div>
                      {vid.status === "error" && vid.errorMessage && (
                        <p className="text-[11px] text-red-400/80 mt-1">{vid.errorMessage}</p>
                      )}
                    </div>
                    <a
                      href={vid.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-center text-xs text-cyan-400 hover:text-cyan-300 font-medium py-1.5 bg-slate-900/80 rounded border border-slate-800 hover:border-cyan-900/50 transition-colors"
                    >
                      Tonton di TikTok ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
