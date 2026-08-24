/**
 * Format angka besar jadi bentuk ringkas ala spec: 4.2M, 850K, dst.
 * Di bawah 1000 ditampilkan apa adanya (locale id-ID, pakai titik ribuan).
 */
export function formatCompactViews(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return trimTrailingZero(value / 1_000_000_000) + "B";
  if (abs >= 1_000_000) return trimTrailingZero(value / 1_000_000) + "M";
  if (abs >= 1_000) return trimTrailingZero(value / 1_000) + "K";
  return value.toLocaleString("id-ID");
}

function trimTrailingZero(n: number): string {
  const fixed = n.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

export function formatFullNumber(value: number): string {
  return value.toLocaleString("id-ID");
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Ambil @username bersih dari string apa pun yang mungkin sudah ada '@' atau spasi. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}
