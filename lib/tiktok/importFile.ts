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

        // Baca array buffer
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert ke JSON Array (semua sel)
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const extractedUrls: string[] = [];
        
        // Regex fleksibel untuk menangkap tautan TikTok
        const tiktokRegex = /https?:\/\/(?:www\.|vt\.|vm\.)?tiktok\.com\/[^\s"',]+/gi;

        jsonRows.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (cell !== undefined && cell !== null) {
                const cellStr = String(cell).trim();
                const matches = cellStr.match(tiktokRegex);
                if (matches) {
                  matches.forEach((url) => {
                    // Bersihkan karakter ekstra di ujung URL
                    const cleanUrl = url.replace(/[;,\)\.]+$ /g, "").trim();
                    extractedUrls.push(cleanUrl);
                  });
                }
              }
            });
          }
        });

        const uniqueUrls = Array.from(new Set(extractedUrls));
        resolve(uniqueUrls);
      } catch (err) {
        console.error("Error parsing excel file:", err);
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    
    // Gunakan ArrayBuffer
    reader.readAsArrayBuffer(file);
  });
}