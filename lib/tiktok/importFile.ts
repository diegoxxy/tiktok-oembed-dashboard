import * as XLSX from "xlsx";

export async function parseImportFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          resolve([]);
          return;
        }

        // Membaca workbook menggunakan ArrayBuffer/Binary String
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert isi sheet ke teks mentah
        const rawText = XLSX.utils.sheet_to_txt(worksheet);

        // Extract semua URL TikTok menggunakan Regex
        const tiktokUrlRegex = /https?:\/\/(?:www\.|vt\.|vm\.)?tiktok\.com\/[^\s"',]+/gi;
        const matches = rawText.match(tiktokUrlRegex) || [];

        // Bersihkan trailing punctuation (koma, titik, kurung)
        const cleanedUrls = matches.map((url) =>
          url.replace(/[;,\)\.]+$ /g, "").trim()
        );

        // Hapus duplikat
        const uniqueUrls = Array.from(new Set(cleanedUrls));
        resolve(uniqueUrls);
      } catch (err) {
        console.error("Error parsing excel file:", err);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);

    // Gunakan readAsBinaryString agar kompatibel penuh dengan xlsx & csv
    reader.readAsBinaryString(file);
  });
}