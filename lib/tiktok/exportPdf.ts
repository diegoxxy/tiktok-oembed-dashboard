import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult } from "./types";

export function exportResultToPdf(result: AnalysisResult) {
  const doc = new jsPDF();
  const currentDate = new Date().toLocaleString("id-ID");
  const { hashtag, globalMetrics, creators, allVideos } = result;

  // Header Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Laporan Ringkasan & Detail Kampanye TikTok", 14, 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Hashtag Kampanye: ${hashtag}`, 14, 22);
  doc.text(`Dibuat: ${currentDate}`, 14, 27);

  // Summary Table
  const summaryData = [
    ["Total Submissions", globalMetrics.totalSubmitted.toString()],
    ["Qualified", `${globalMetrics.totalQualified} (${globalMetrics.qualifiedRate.toFixed(1)}%)`],
    ["Unqualified", globalMetrics.totalUnqualified.toString()],
    ["Error / Private", globalMetrics.totalError.toString()],
    ["Total Campaign Views", globalMetrics.totalViews.toLocaleString("id-ID")],
    ["Total Likes", globalMetrics.totalLikes.toLocaleString("id-ID")],
    ["Total Comments", globalMetrics.totalComments.toLocaleString("id-ID")],
    ["Total Shares", globalMetrics.totalShares.toLocaleString("id-ID")],
    ["Total Saves", globalMetrics.totalSaves.toLocaleString("id-ID")],
    ["Total Kreator Terlibat", globalMetrics.totalCreators.toString()],
    ["Top Creator", globalMetrics.topCreator ? `@${globalMetrics.topCreator.authorName} (${globalMetrics.topCreator.totalViews.toLocaleString("id-ID")} views)` : "-"],
    ["Top Video", globalMetrics.topVideo ? `${globalMetrics.topVideo.authorName} (${globalMetrics.topVideo.views.toLocaleString("id-ID")} views)` : "-"],
  ];

  autoTable(doc, {
    startY: 32,
    head: [["Indikator", "Nilai"]],
    body: summaryData,
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59] },
  });

  // Table 1: Per Creator Breakdown
  let currentY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. Ringkasan Per Kreator", 14, currentY);

  autoTable(doc, {
    startY: currentY + 4,
    head: [["Username", "Video Upload", "Total Views", "Total Likes", "Total Comments", "Total Engagement"]],
    body: creators.map((c) => [
      `@${c.authorName}`,
      c.videos.length,
      c.totalViews.toLocaleString("id-ID"),
      c.totalLikes.toLocaleString("id-ID"),
      c.totalComments.toLocaleString("id-ID"),
      (c.totalLikes + c.totalComments + c.totalShares + c.totalSaves).toLocaleString("id-ID"),
    ]),
    theme: "grid",
    headStyles: { fillColor: [15, 23, 42] },
  });

  // Table 2: Detail All Videos & Links
  doc.addPage();
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. Daftar Link Video & Engagement Metrics", 14, 15);

  autoTable(doc, {
    startY: 20,
    head: [["Posting Date", "Creator", "Status", "Views", "Likes", "Comments", "Shares", "Saves", "Link Video"]],
    body: allVideos.map((v) => [
      v.postedAt || "-",
      `@${v.authorName}`,
      v.status.toUpperCase(),
      v.views.toLocaleString("id-ID"),
      (v.likes || 0).toLocaleString("id-ID"),
      (v.comments || 0).toLocaleString("id-ID"),
      (v.shares || 0).toLocaleString("id-ID"),
      (v.saves || 0).toLocaleString("id-ID"),
      v.sourceUrl || v.videoUrl,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [15, 23, 42] },
    columnStyles: {
      8: { cellWidth: 45 },
    },
  });

  doc.save(`TikTok-Campaign-Report-${Date.now()}.pdf`);
}