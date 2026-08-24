"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";

// Menangkap URL TikTok dalam bentuk apa pun: tiktok.com/@user/video/123,
// vt.tiktok.com/xxx, vm.tiktok.com/xxx, dengan atau tanpa query string.
const TIKTOK_URL_REGEX = /https?:\/\/(?:www\.|vt\.|vm\.|m\.)?tiktok\.com\/\S+/gi;

export interface ImportResult {
  urls: string[];
  totalCellsScanned: number;
  duplicatesSkipped: number;
}

/**
 * Auto Column Mapping: pindai SEMUA sel di file (tanpa asumsi nama/posisi kolom),
 * lalu ambil apa pun yang match pola URL TikTok. Jadi file dengan header apa pun,
 * atau tanpa header sama sekali, tetap bisa diproses.
 */
export function extractTikTokUrls(rows: unknown[][]): ImportResult {
  const found: string[] = [];
  let totalCellsScanned = 0;

  for (const row of rows) {
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      totalCellsScanned += 1;
      const cellStr = String(cell);
      const matches = cellStr.match(TIKTOK_URL_REGEX);
      if (matches) {
        for (const m of matches) found.push(m.trim().replace(/[,;]+$/, ""));
      }
    }
  }

  const seen = new Set<string>();
  const urls: string[] = [];
  let duplicatesSkipped = 0;
  for (const url of found) {
    if (seen.has(url)) {
      duplicatesSkipped += 1;
      continue;
    }
    seen.add(url);
    urls.push(url);
  }

  return { urls, totalCellsScanned, duplicatesSkipped };
}

export async function parseImportFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    return extractTikTokUrls(parsed.data as unknown[][]);
  }

  // .xlsx / .xls — baca semua sheet, gabungkan semua baris.
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const allRows: unknown[][] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });
    allRows.push(...rows);
  }
  return extractTikTokUrls(allRows);
}
