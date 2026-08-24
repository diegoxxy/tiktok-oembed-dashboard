import type { GlobalMetrics } from "@/lib/tiktok/types";
import { formatCompactViews, formatFullNumber, formatPercent } from "@/lib/tiktok/format";
import { ClipboardCheck, Eye, Crown, Flame } from "lucide-react";

export default function KpiRibbon({ metrics, hashtag }: { metrics: GlobalMetrics; hashtag: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Ringkasan Performa Kampanye <span className="text-cyan-400">{hashtag}</span>
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submissions vs Qualified Rate */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-5 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <ClipboardCheck className="w-3.5 h-3.5" /> SUBMISSIONS
          </div>
          <p className="text-2xl font-bold text-white mt-2">
            {formatFullNumber(metrics.totalSubmitted)}{" "}
            <span className="text-xs font-normal text-slate-400">video</span>
          </p>
          <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(100, metrics.qualifiedRate)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Qualified rate: <span className="text-emerald-400 font-semibold">{formatPercent(metrics.qualifiedRate)}</span>
          </p>
        </div>

        {/* Total Campaign Views */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-5 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Eye className="w-3.5 h-3.5" /> TOTAL CAMPAIGN VIEWS
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{formatCompactViews(metrics.totalViews)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{formatFullNumber(metrics.totalViews)} views (qualified)</p>
        </div>

        {/* Top Creator */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-5 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Crown className="w-3.5 h-3.5 text-cyan-400" /> TOP CREATOR
          </div>
          {metrics.topCreator ? (
            <>
              <p className="text-lg font-bold text-cyan-400 mt-2 truncate">@{metrics.topCreator.authorName}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {formatFullNumber(metrics.topCreator.totalViews)} views
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500 mt-3">Belum ada data</p>
          )}
        </div>

        {/* Top Video */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-5 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> TOP VIDEO
          </div>
          {metrics.topVideo ? (
            <>
              <p className="text-sm font-semibold text-white mt-2 line-clamp-2">{metrics.topVideo.title || "(tanpa caption)"}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                @{metrics.topVideo.authorName} · {formatFullNumber(metrics.topVideo.views)} views
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500 mt-3">Belum ada data</p>
          )}
        </div>
      </div>
    </div>
  );
}
