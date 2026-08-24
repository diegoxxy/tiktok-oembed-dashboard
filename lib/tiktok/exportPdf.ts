"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult } from "./types";
import { formatFullNumber, formatPercent } from "./format";

/**
 * PDF ringkasan eksekutif (bukan dump 1.000 baris — untuk itu pakai Export Excel).
 * Isinya: KPI utama + top 10 kreator, siap dikirim ke klien/manajemen.
 */
export function exportResultToPdf(result: AnalysisResult, fileNamePrefix = "tiktok-campaign") {
  const doc = new jsPDF();
  const m = result.globalMetrics;

  doc.setFontSize(16);
  doc.text("Laporan Ringkasan Kampanye TikTok", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Hashtag kampanye: ${result.hashtag}`, 14, 25);
  doc.text(`Dibuat: ${new Date().toLocaleString("id-ID")}`, 14, 30);

  autoTable(doc, {
    startY: 38,
    head: [["Indikator", "Nilai"]],
    body: [
      ["Total Submissions", formatFullNumber(m.totalSubmitted)],
      ["Qualified", `${formatFullNumber(m.totalQualified)} (${formatPercent(m.qualifiedRate)})`],
      ["Unqualified", formatFullNumber(m.totalUnqualified)],
      ["Error / Private", formatFullNumber(m.totalError)],
      ["Total Campaign Views", formatFullNumber(m.totalViews)],
      ["Total Kreator Terlibat", formatFullNumber(m.totalCreators)],
      ["Top Creator", m.topCreator ? `@${m.topCreator.authorName} — ${formatFullNumber(m.topCreator.totalViews)} views` : "-"],
      ["Top Video", m.topVideo ? `@${m.topVideo.authorName} — ${formatFullNumber(m.topVideo.views)} views` : "-"],
    ],
    theme: "grid",
    headStyles: { fillColor: [11, 15, 25] },
    styles: { fontSize: 10 },
  });

  const afterKpiY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setTextColor(20);
  doc.text("Top 10 Kreator (berdasarkan total views)", 14, afterKpiY);

  const topCreators = [...result.creators]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 10);

  autoTable(doc, {
    startY: afterKpiY + 4,
    head: [["#", "Username", "Video", "Total Views"]],
    body: topCreators.map((c, idx) => [
      String(idx + 1),
      `@${c.authorName}`,
      String(c.videoCount),
      formatFullNumber(c.totalViews),
    ]),
    theme: "striped",
    headStyles: { fillColor: [11, 15, 25] },
    styles: { fontSize: 10 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`${fileNamePrefix}-summary-${stamp}.pdf`);
}
