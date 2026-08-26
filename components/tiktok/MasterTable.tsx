"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { VideoItem } from "@/lib/tiktok/types";
import { formatFullNumber } from "@/lib/tiktok/format";
import { ExternalLink } from "lucide-react";
import StatusBadge from "./StatusBadge";

const ROW_HEIGHT = 64;

export default function MasterTable({ videos }: { videos: VideoItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: videos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  if (videos.length === 0) {
    return (
      <div className="bg-[#131b2e] border border-[#1e293b] rounded-xl p-10 text-center text-slate-400">
        Tidak ada video yang cocok dengan filter saat ini.
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div className="bg-[#131b2e] border border-[#1e293b] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[56px_90px_1fr_140px_110px_120px_90px] gap-3 px-4 py-2.5 border-b border-[#1e293b] text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        <span>Cover</span>
        <span>Platform</span>
        <span>Caption</span>
        <span>Username</span>
        <span className="text-right">Views</span>
        <span>Status</span>
        <span className="text-right">Link</span>
      </div>

      {/* Virtualized body */}
      <div ref={scrollRef} className="h-[65vh] overflow-y-auto enterprise-scroll">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {items.map((vRow) => {
            const vid = videos[vRow.index];
            return (
              <div
                key={vid.id + vRow.index}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: ROW_HEIGHT,
                  transform: `translateY(${vRow.start}px)`,
                }}
                className="grid grid-cols-[56px_90px_1fr_140px_110px_120px_90px] gap-3 px-4 items-center border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors"
              >
                {/* Cover Image */}
                {vid.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={vid.coverUrl} alt="" className="w-9 h-12 object-cover rounded border border-slate-800" />
                ) : (
                  <div className="w-9 h-12 rounded border border-slate-800 bg-slate-900" />
                )}

                {/* Platform Badge */}
                <div>
                  {vid.platform === "youtube" ? (
                    <span className="inline-block rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400 border border-red-500/20">
                      YouTube
                    </span>
                  ) : (
                    <span className="inline-block rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/20">
                      TikTok
                    </span>
                  )}
                </div>

                {/* Caption */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-snug min-w-0">
                  {vid.title || <span className="italic text-slate-600">(tanpa caption)</span>}
                </p>

                {/* Username */}
                <a
                  href={vid.authorUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-cyan-400 hover:underline truncate"
                >
                  @{vid.authorName}
                </a>

                {/* Views */}
                <span className="text-xs font-semibold text-amber-400 text-right">
                  {formatFullNumber(vid.views)}
                </span>

                {/* Status */}
                <span>
                  <StatusBadge status={vid.status} />
                </span>

                {/* Link */}
                <a
                  href={vid.sourceUrl || vid.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-end gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  Buka <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}