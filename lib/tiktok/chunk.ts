/** Pecah array jadi potongan-potongan berukuran `size`. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Jalankan sekumpulan chunk secara teratur dengan jeda waktu antar batch
 * untuk menjaga pengambilan data tetap real-time tanpa memicu rate-limit API.
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
      // Jeda 1 detik antar chunk batch
      if (nextIndex < chunks.length) {
        await delay(1000);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, () => runOne());
  await Promise.all(workers);
}