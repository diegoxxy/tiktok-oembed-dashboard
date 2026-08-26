import type { CreatorGroup } from "@/lib/tiktok/types";
import { formatCompactViews } from "@/lib/tiktok/format";
import { Crown, Video, Eye, Heart } from "lucide-react";

interface FolderViewProps {
  creators: CreatorGroup[];
  onOpenCreatorDrawer?: (authorName: string) => void;
}

function avatarHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return hash;
}

function CreatorAvatar({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- CDN domain TikTok berubah-ubah, tidak cocok untuk next/image allowlist
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-11 h-11 rounded-full object-cover border border-slate-700 flex-shrink-0"
      />
    );
  }
  const hue = avatarHue(name);
  return (
    <div
      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 border border-slate-700"
      style={{ backgroundColor: `hsl(${hue} 45% 28%)` }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CreatorCard({
  creator,
  onOpenCreatorDrawer,
}: {
  creator: CreatorGroup;
  onOpenCreatorDrawer?: (authorName: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenCreatorDrawer?.(creator.authorName)}
      className="w-full text-left bg-[#0b0f19] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-4 transition-all hover:translate-y-[-2px] cursor-pointer relative group"
    >
      {creator.isTopCreator && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded">
          <Crown className="w-3 h-3" /> TOP
        </span>
      )}
      <div className="flex items-center gap-3">
        <CreatorAvatar name={creator.authorName} avatarUrl={creator.authorAvatar} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-cyan-400 group-hover:text-cyan-300 truncate">
            @{creator.authorName}
          </p>
          <p className="text-[11px] text-slate-500">Kreator</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-1 text-slate-400">
          <Video className="w-3.5 h-3.5" />
          {creator.videoCount}
        </div>
        <div className="flex items-center gap-1 text-amber-400 font-semibold">
          <Eye className="w-3.5 h-3.5" />
          {formatCompactViews(creator.totalViews)}
        </div>
        <div className="flex items-center gap-1 text-rose-400 font-semibold">
          <Heart className="w-3.5 h-3.5" />
          {formatCompactViews(creator.totalLikes || 0)}
        </div>
      </div>
    </button>
  );
}

export default function FolderView({ creators, onOpenCreatorDrawer }: FolderViewProps) {
  if (creators.length === 0) {
    return (
      <div className="bg-[#131b2e] border border-[#1e293b] rounded-xl p-10 text-center text-slate-400">
        Tidak ada kreator yang cocok dengan filter saat ini.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {creators.map((creator) => (
        <CreatorCard
          key={creator.authorName}
          creator={creator}
          onOpenCreatorDrawer={onOpenCreatorDrawer}
        />
      ))}
    </div>
  );
}

export { CreatorAvatar };