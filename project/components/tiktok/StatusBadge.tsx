import type { VideoStatus } from "@/lib/tiktok/types";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const STYLES: Record<VideoStatus, string> = {
  qualified: "bg-emerald-950/40 text-emerald-400 border-emerald-900/50",
  unqualified: "bg-slate-800/60 text-slate-400 border-slate-700",
  error: "bg-red-950/40 text-red-400 border-red-900/50",
};

const LABELS: Record<VideoStatus, string> = {
  qualified: "Qualified",
  unqualified: "Unqualified",
  error: "Error/Private",
};

const ICONS: Record<VideoStatus, React.ComponentType<{ className?: string }>> = {
  qualified: CheckCircle2,
  unqualified: AlertTriangle,
  error: XCircle,
};

export default function StatusBadge({ status }: { status: VideoStatus }) {
  const Icon = ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${STYLES[status]}`}
    >
      <Icon className="w-3 h-3" />
      {LABELS[status]}
    </span>
  );
}
