"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import type { VideoItem } from "@/lib/tiktok/types";
import { formatCompactViews, formatFullNumber } from "@/lib/tiktok/format";
import { Eye, Heart, MessageSquare, Share2, Bookmark, ArrowLeft, ExternalLink } from "lucide-react";

export default function CreatorDetailPage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const username = decodeURIComponent(resolvedParams.username);

  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);

  useEffect(() => {
    // Membaca data hasil scan dari localStorage
    const cached = localStorage.getItem("tiktok_analytics_last_scan");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setAllVideos(parsed);
        }
      } catch (err) {
        console.error("Gagal membaca cache video:", err);
      }
    }
  }, []);

  // Filter video khusus username ini
  const creatorVideos = useMemo(() => {
    return allVideos.filter(
      (v) => v.authorName.toLowerCase() === username.toLowerCase()
    );
  }, [allVideos, username]);

  // Deteksi Platform Kreator Utama & URL Profil
  const primaryPlatform = useMemo(() => {
    const firstVideo = creatorVideos[0];
    if (!firstVideo) return { name: "TikTok", profileUrl: `https://www.tiktok.com/@${username}` };

    const isYouTube =
      firstVideo.platform === "youtube" ||
      firstVideo.sourceUrl?.includes("youtube") ||
      firstVideo.sourceUrl?.includes("youtu.be");

    return {
      name: isYouTube ? "YouTube" : "TikTok",
      profileUrl: firstVideo.authorUrl || (isYouTube ? `https://www.youtube.com` : `https://www.tiktok.com/@${username}`),
    };
  }, [creatorVideos, username]);

  // Hitung total engagement per kreator
  const stats = useMemo(() => {
    return creatorVideos.reduce(
      (acc, v) => ({
        views: acc.views + (v.views || 0),
        likes: acc.likes + (v.likes || 0),
        comments: acc.comments + (v.comments || 0),
        shares: acc.shares + (v.shares || 0),
        saves: acc.saves + (v.saves || 0),
      }),
      { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
    );
  }, [creatorVideos]);

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigasi Kembali */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </Link>

        {/* Header Profil Kreator */}
        <div className="bg-[#131b2e] border border-[#1e293b] p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-cyan-500/40 flex items-center justify-center text-xl font-bold text-cyan-400 overflow-hidden">
              {creatorVideos[0]?.authorAvatar ? (
                <img
                  src={creatorVideos[0].authorAvatar}
                  alt={username}
                  className="w-full h-full object-cover"
                />
              ) : (
                `@${username.slice(0, 2).toUpperCase()}`
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">@{username}</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Total Submissions: <strong className="text-white">{creatorVideos.length} Video</strong>
              </p>
            </div>
          </div>

          <a
            href={primaryPlatform.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm rounded-xl transition"
          >
            Buka Profil {primaryPlatform.name} <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Ringkasan Engagement Kreator */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> VIEWS</span>
            <p className="text-xl font-bold text-amber-400 mt-1">{formatCompactViews(stats.views)}</p>
          </div>
          <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400" /> LIKES</span>
            <p className="text-xl font-bold text-rose-400 mt-1">{formatCompactViews(stats.likes)}</p>
          </div>
          <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
            <span className="text-xs text-slate-400 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-blue-400" /> COMMENTS</span>
            <p className="text-xl font-bold text-blue-400 mt-1">{formatCompactViews(stats.comments)}</p>
          </div>
          <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-purple-400" /> SHARES</span>
            <p className="text-xl font-bold text-purple-400 mt-1">{formatCompactViews(stats.shares)}</p>
          </div>
          <div className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Bookmark className="w-3.5 h-3.5 text-emerald-400" /> SAVES</span>
            <p className="text-xl font-bold text-emerald-400 mt-1">{formatCompactViews(stats.saves)}</p>
          </div>
        </div>

        {/* Daftar Video */}
        <h2 className="text-lg font-bold text-white pt-2">Daftar Video ({creatorVideos.length})</h2>

        {creatorVideos.length === 0 ? (
          <div className="bg-[#131b2e] border border-[#1e293b] p-8 rounded-xl text-center text-slate-400">
            Data video belum tersimpan di browser. Silakan lakukan **Scan** ulang pada halaman utama.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creatorVideos.map((video) => {
              const isYouTube =
                video.platform === "youtube" ||
                video.sourceUrl?.includes("youtube") ||
                video.sourceUrl?.includes("youtu.be");
              const platformLabel = isYouTube ? "YouTube" : "TikTok";

              return (
                <div
                  key={video.id || video.sourceUrl}
                  className="bg-[#131b2e] border border-[#1e293b] p-4 rounded-xl flex gap-4"
                >
                  <div className="w-28 h-40 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 border border-slate-800 relative">
                    {video.coverUrl ? (
                      <img src={video.coverUrl} alt={video.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">No Cover</div>
                    )}
                    <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                      video.status === "qualified" ? "bg-emerald-500/80 text-white" : "bg-rose-500/80 text-white"
                    }`}>
                      {video.status}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-white line-clamp-2">
                        {video.title || "(Tanpa Caption)"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Diposting: {video.postedAt || "-"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-800/80 my-2">
                      <span className="text-amber-400 font-semibold">👁 {formatFullNumber(video.views)}</span>
                      <span className="text-rose-400 font-semibold">❤️ {formatFullNumber(video.likes)}</span>
                      <span className="text-blue-400 font-semibold">💬 {formatFullNumber(video.comments)}</span>
                      <span className="text-purple-400 font-semibold">🔁 {formatFullNumber(video.shares)}</span>
                    </div>

                    <a
                      href={video.videoUrl || video.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 py-1.5 px-3 rounded-lg font-medium transition"
                    >
                      Tonton di {platformLabel} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}