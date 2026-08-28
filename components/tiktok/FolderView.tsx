"use client";

import { useState } from "react";
import type { CreatorGroup, VideoItem } from "@/lib/tiktok/types";

interface FolderViewProps {
  creators: CreatorGroup[];
  onUpdateVideo?: (updatedVideo: VideoItem) => void;
}

export default function FolderView({ creators, onUpdateVideo }: FolderViewProps) {
  const [selectedCreator, setSelectedCreator] = useState<CreatorGroup | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);

  // Form State
  const [editAuthor, setEditAuthor] = useState("");
  const [editViews, setEditViews] = useState<number>(0);
  const [editLikes, setEditLikes] = useState<number>(0);
  const [editComments, setEditComments] = useState<number>(0);
  const [editShares, setEditShares] = useState<number>(0);
  const [editSaves, setEditSaves] = useState<number>(0);

  const handleOpenEdit = (v: VideoItem) => {
    setEditingVideo(v);
    setEditAuthor(v.authorName === "instagram_creator" ? "" : v.authorName);
    setEditViews(v.views || 0);
    setEditLikes(v.likes || 0);
    setEditComments(v.comments || 0);
    setEditShares(v.shares || 0);
    setEditSaves(v.saves || 0);
  };

  const handleSaveEdit = () => {
    if (!editingVideo) return;

    const newUsername = editAuthor.trim().toLowerCase().replace(/^@/, "");
    const finalAuthor = newUsername || editingVideo.authorName;

    const updated: VideoItem = {
      ...editingVideo,
      authorName: finalAuthor,
      authorDisplayName: `@${finalAuthor}`,
      authorUrl: editingVideo.sourceUrl.includes("instagram.com")
        ? `https://www.instagram.com/${finalAuthor}`
        : editingVideo.authorUrl,
      views: Number(editViews) || 0,
      likes: Number(editLikes) || 0,
      comments: Number(editComments) || 0,
      shares: Number(editShares) || 0,
      saves: Number(editSaves) || 0,
      status: "qualified",
    };

    if (onUpdateVideo) {
      onUpdateVideo(updated);
    }

    if (selectedCreator) {
      const updatedVideos = selectedCreator.videos.map((vid) =>
        vid.id === updated.id ? updated : vid
      );
      setSelectedCreator({
        ...selectedCreator,
        authorName: finalAuthor,
        authorDisplayName: `@${finalAuthor}`,
        videos: updatedVideos,
        totalViews: updatedVideos.reduce((a, b) => a + (b.views || 0), 0),
        totalLikes: updatedVideos.reduce((a, b) => a + (b.likes || 0), 0),
        totalComments: updatedVideos.reduce((a, b) => a + (b.comments || 0), 0),
        totalShares: updatedVideos.reduce((a, b) => a + (b.shares || 0), 0),
        totalSaves: updatedVideos.reduce((a, b) => a + (b.saves || 0), 0),
      });
    }

    setEditingVideo(null);
  };

  if (selectedCreator) {
    const creatorAvatar = selectedCreator.videos.find((v) => v.authorAvatar)?.authorAvatar;

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedCreator(null)}
          className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
        >
          ← Kembali ke Semua Folder Kreator
        </button>

        {/* Header Dalam Folder Kreator */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            {creatorAvatar ? (
              <img
                src={creatorAvatar}
                alt={selectedCreator.authorName}
                className="w-16 h-16 rounded-full object-cover border border-cyan-800/50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 text-xl font-bold uppercase">
                @{selectedCreator.authorName.slice(0, 2)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">@{selectedCreator.authorName}</h2>
              <p className="text-xs text-slate-400">Total Link Video: {selectedCreator.videos.length} Video</p>
            </div>
          </div>
        </div>

        {/* List Card Video */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedCreator.videos.map((v) => (
            <div
              key={v.id}
              className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex flex-col justify-between space-y-4"
            >
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {v.status}
                </span>
                <h4 className="text-xs font-semibold text-slate-200 mt-2 line-clamp-2">
                  {v.title}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1 truncate">
                  {v.sourceUrl}
                </p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-[11px] text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-center">
                <div>
                  <span className="block text-[10px] text-slate-500">Views</span>
                  <strong className="text-amber-400">{(v.views || 0).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Likes</span>
                  <strong className="text-rose-400">{(v.likes || 0).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Comments</span>
                  <strong className="text-cyan-400">{(v.comments || 0).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Shares</span>
                  <strong className="text-emerald-400">{(v.shares || 0).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">Saves</span>
                  <strong className="text-purple-400">{(v.saves || 0).toLocaleString("id-ID")}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={v.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-center rounded-lg text-xs font-medium transition-colors"
                >
                  Buka Link Asli ↗
                </a>
                <button
                  onClick={() => handleOpenEdit(v)}
                  className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                >
                  ✏️ Edit Data
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Edit */}
        {editingVideo && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#111827] border border-[#1e293b] p-6 rounded-xl max-w-lg w-full space-y-4">
              <h3 className="text-base font-bold text-white">Edit Data Video & Username</h3>
              <p className="text-xs text-slate-400 truncate">{editingVideo.sourceUrl}</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Username Creator</label>
                  <input
                    type="text"
                    placeholder="Contoh: nama_creator"
                    value={editAuthor}
                    onChange={(e) => setEditAuthor(e.target.value)}
                    className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Views</label>
                    <input
                      type="number"
                      value={editViews}
                      onChange={(e) => setEditViews(Number(e.target.value))}
                      className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Likes</label>
                    <input
                      type="number"
                      value={editLikes}
                      onChange={(e) => setEditLikes(Number(e.target.value))}
                      className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Comments</label>
                    <input
                      type="number"
                      value={editComments}
                      onChange={(e) => setEditComments(Number(e.target.value))}
                      className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Shares</label>
                    <input
                      type="number"
                      value={editShares}
                      onChange={(e) => setEditShares(Number(e.target.value))}
                      className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Saves</label>
                  <input
                    type="number"
                    value={editSaves}
                    onChange={(e) => setEditSaves(Number(e.target.value))}
                    className="w-full bg-[#0b0f19] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  Simpan & Update Ekspor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {creators.map((c) => {
        const avatarUrl = c.videos.find((v) => v.authorAvatar)?.authorAvatar;

        return (
          <div
            key={c.authorName}
            onClick={() => setSelectedCreator(c)}
            className="bg-[#111827] border border-[#1e293b] hover:border-cyan-500/50 p-5 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={c.authorName}
                    className="w-10 h-10 rounded-full object-cover border border-cyan-800"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-bold text-sm uppercase">
                    @{c.authorName.slice(0, 2)}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-[150px]">
                    @{c.authorName}
                  </h3>
                  <p className="text-[10px] text-slate-400">{c.videos.length} Video Link</p>
                </div>
              </div>
              <span className="text-xs text-cyan-400 font-semibold">Buka Folder →</span>
            </div>

            <div className="grid grid-cols-5 gap-1 text-[10px] pt-3 border-t border-slate-800/60 text-slate-400 text-center">
              <div>
                <span className="block text-[9px] text-slate-500">Views</span>
                <span className="font-bold text-amber-400">{c.totalViews.toLocaleString("id-ID")}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500">Likes</span>
                <span className="font-bold text-rose-400">{(c.totalLikes || 0).toLocaleString("id-ID")}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500">Comments</span>
                <span className="font-bold text-cyan-400">{(c.totalComments || 0).toLocaleString("id-ID")}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500">Shares</span>
                <span className="font-bold text-emerald-400">{(c.totalShares || 0).toLocaleString("id-ID")}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500">Saves</span>
                <span className="font-bold text-purple-400">{(c.totalSaves || 0).toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}