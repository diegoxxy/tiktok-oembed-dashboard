/** Pecah array jadi potongan-potongan berukuran `size`. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Jalankan sekumpulan chunk lewat `worker` dengan concurrency terbatas,
 * memanggil `onChunkDone` progresif setiap satu chunk selesai (sukses/gagal)
 * supaya UI bisa update secara streaming, bukan menunggu semuanya selesai.
 */
export async function runChunksWithConcurrency<TChunk, TResult>(
  chunks: TChunk[],
  concurrency: number,
  worker: (chunk: TChunk, chunkIndex: number) => Promise<TResult>,
  onChunkDone?: (result: TResult | null, chunkIndex: number, error: unknown) => void
): Promise<void> {
  let nextIndex = 0;

  async function runOne(): Promise<void> {
    while (nextIndex < chunks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        const result = await worker(chunks[currentIndex], currentIndex);
        onChunkDone?.(result, currentIndex, null);
      } catch (err) {
        onChunkDone?.(null, currentIndex, err);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, () => runOne());
  await Promise.all(workers);
}
