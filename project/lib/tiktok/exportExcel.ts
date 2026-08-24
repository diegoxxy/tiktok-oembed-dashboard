"use client";

import * as XLSX from "xlsx";
import type { AnalysisResult } from "./types";
import { formatFullNumber, formatPercent } from "./format";

const STATUS_LABEL: Record<string, string> = {
  qualified: "Qualified",
  unqualified: "Unqualified",
  error: "Error/Private",
};

export function exportResultToExcel(result: AnalysisResult, fileNamePrefix = "tiktok-campaign") {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Ringkasan
  const m = result.globalMetrics;
  const summaryRows: (string | number)[][] = [
    ["Ringkasan Kampanye", result.hashtag],
    [],
    ["Total Submissions", m.totalSubmitted],
    ["Qualified", m.totalQualified],
    ["Unqualified", m.totalUnqualified],
    ["Error / Private", m.totalError],
    ["Qualified Rate", formatPercent(m.qualifiedRate)],
    ["Total Campaign Views", formatFullNumber(m.totalViews)],
    ["Total Kreator", m.totalCreators],
    ["Top Creator", m.topCreator ? `@${m.topCreator.authorName} (${formatFullNumber(m.topCreator.totalViews)} views)` : "-"],
    ["Top Video", m.topVideo ? `${m.topVideo.title} — @${m.topVideo.authorName} (${formatFullNumber(m.topVideo.views)} views)` : "-"],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Ringkasan");

  // Sheet 2 — Per Kreator
  const creatorRows = [
    ["Username", "Total Video", "Video Qualified", "Total Views", "Profile URL"],
    ...result.creators.map((c) => [
      `@${c.authorName}`,
      c.videoCount,
      c.qualifiedCount,
      c.totalViews,
      c.authorUrl,
    ]),
  ];
  const creatorSheet = XLSX.utils.aoa_to_sheet(creatorRows);
  creatorSheet["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, creatorSheet, "Per Kreator");

  // Sheet 3 — Semua Video (master data)
  const videoRows = [
    ["Username", "Caption/Title", "Views", "Status", "Video URL", "Cover URL"],
    ...result.allVideos.map((v) => [
      `@${v.authorName}`,
      v.title,
      v.views,
      STATUS_LABEL[v.status] ?? v.status,
      v.videoUrl,
      v.coverUrl,
    ]),
  ];
  const videoSheet = XLSX.utils.aoa_to_sheet(videoRows);
  videoSheet["!cols"] = [{ wch: 20 }, { wch: 60 }, { wch: 12 }, { wch: 14 }, { wch: 45 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, videoSheet, "Semua Video");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${fileNamePrefix}-${stamp}.xlsx`);
}
