import * as XLSX from "xlsx";

/**
 * Membersihkan URL media dari typo sintaks dan query string/parameter anti-bot
 */
function cleanAndFixMediaUrl(url: string): string {
  let cleaned = url.trim().replace(/[;,\)\.]+$ /g, "");

  // Fix typo missing slash atau double slash khusus TikTok
  cleaned = cleaned.replace(/\/video(\d+)/gi, "/video/$1");
  cleaned = cleaned.replace(/\/video\/{2,}/gi, "/video/");

  // Hapus query parameter (misal: ?is_from_webapp=1&sender_device=pc)
  try {
    const parsed = new URL(cleaned);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return cleaned;
  }
}

export interface ParseResult {
  urls: string[];
  tiktokCount: number;
  youtubeCount: number;
  instagramCount: number;
  totalCount: number;
  summaryMessage: string;
}

/**
 * Menghasilkan pesan notifikasi yang merinci jumlah link TikTok, YouTube, dan Instagram
 */
export function getImportSummary(urls: string[]): ParseResult {
  let tiktokCount = 0;
  let youtubeCount = 0;
  let instagramCount = 0;

  urls.forEach((url) => {
    const lower = url.toLowerCase();
    if (lower.includes("tiktok.com")) {
      tiktokCount++;
    } else if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
      youtubeCount++;
    } else if (lower.includes("instagram.com")) {
      instagramCount++;
    }
  });

  const parts: string[] = [];
  if (tiktokCount > 0) parts.push(`${tiktokCount} link TikTok`);
  if (youtubeCount > 0) parts.push(`${youtubeCount} link YouTube`);
  if (instagramCount > 0) parts.push(`${instagramCount} link Instagram`);

  let summaryMessage = "Berhasil mengimpor ";
  if (parts.length > 0) {
    summaryMessage += parts.join(", ") + "!";
  } else {
    summaryMessage = `Berhasil mengimpor ${urls.length} link!`;
  }

  return {
    urls,
    tiktokCount,
    youtubeCount,
    instagramCount,
    totalCount: urls.length,
    summaryMessage,
  };
}

export async function parseImportFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve(getImportSummary([]));
          return;
        }

        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const extractedUrls: string[] = [];

        // Regex fleksibel menangkap TikTok, YouTube & Instagram
        const mediaRegex =
          /https?:\/\/(?:www\.|vt\.|vm\.)?(?:tiktok\.com|youtube\.com|youtu\.be|instagram\.com)\/[^\s"',]+/gi;

        jsonRows.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (cell !== undefined && cell !== null) {
                const cellStr = String(cell).trim();
                const matches = cellStr.match(mediaRegex);
                if (matches) {
                  matches.forEach((url) => {
                    const cleanUrl = cleanAndFixMediaUrl(url);
                    if (cleanUrl) {
                      extractedUrls.push(cleanUrl);
                    }
                  });
                }
              }
            });
          }
        });

        const uniqueUrls = Array.from(new Set(extractedUrls));
        resolve(getImportSummary(uniqueUrls));
      } catch (err) {
        console.error("Error parsing excel file:", err);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}