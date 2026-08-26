import type { GlobalMetrics } from "@/lib/tiktok/types";
import { formatCompactViews, formatFullNumber, formatPercent } from "@/lib/tiktok/format";
import { ClipboardCheck, Eye, Crown, Flame, Heart, MessageSquare, Share2, Bookmark } from "lucide-react";

export default function KpiRibbon({ metrics, hashtag }: { metrics: GlobalMetrics; hashtag: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Ringkasan Performa Kampanye <span className="text-cyan-400">{hashtag}</span>
      </h2>
      
      {/* Grid Utama Metrik Engagement */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Submissions */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            <ClipboardCheck className="w-3.5 h-3.5 flex-shrink-0" /> SUBMISSIONS
          </div>
          <p className="text-xl font-bold text-white mt-2">
            {formatFullNumber(metrics.totalSubmitted)}
          </p>
          <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${Math.min(100, metrics.qualifiedRate)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            Qual.: <span className="text-emerald-400 font-semibold">{formatPercent(metrics.qualifiedRate)}</span>
          </p>
        </div>

        {/* Total Views */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            <Eye className="w-3.5 h-3.5 flex-shrink-0" /> VIEWS
          </div>
          <p className="text-xl font-bold text-amber-400 mt-2">{formatCompactViews(metrics.totalViews)}</p>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{formatFullNumber(metrics.totalViews)}</p>
        </div>

        {/* Total Likes */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            <Heart className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" /> LIKES
          </div>
          <p className="text-xl font-bold text-rose-400 mt-2">{formatCompactViews(metrics.totalLikes || 0)}</p>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{formatFullNumber(metrics.totalLikes || 0)}</p>
        </div>

        {/* Total Comments */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> COMMENTS
          </div>
          <p className="text-xl font-bold text-blue-400 mt-2">{formatCompactViews(metrics.totalComments || 0)}</p>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{formatFullNumber(metrics.totalComments || 0)}</p>
        </div>

        {/* Total Shares */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            <Share2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" /> SHARES
          </div>
          <p className="text-xl font-bold text-purple-400 mt-2">{formatCompactViews(metrics.totalShares || 0)}</p>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{formatFullNumber(metrics.totalShares || 0)}</p>
        </div>

        {/* Total Saves */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            <Bookmark className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> SAVES
          </div>
          <p className="text-xl font-bold text-emerald-400 mt-2">{formatCompactViews(metrics.totalSaves || 0)}</p>
          <p className="text-[10px] text-slate-500 mt-1 truncate">{formatFullNumber(metrics.totalSaves || 0)}</p>
        </div>

        {/* Top Creator */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl col-span-2 md:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
            <Crown className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" /> TOP CREATOR
          </div>
          {metrics.topCreator ? (
            <div className="flex items-baseline justify-between gap-2 mt-2">
              <p className="text-lg font-bold text-cyan-400 truncate">@{metrics.topCreator.authorName}</p>
              <p className="text-[11px] text-amber-400 font-semibold flex-shrink-0">
                {formatCompactViews(metrics.topCreator.totalViews)} views
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-2">Belum ada data</p>
          )}
        </div>
      </div>
    </div>
  );
}