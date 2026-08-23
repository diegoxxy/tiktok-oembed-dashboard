'use client';

import { useState } from 'react';

interface QualifiedVideo {
  id: string;
  title: string;
  authorName: string;
  authorUrl: string;
  coverUrl: string;
  videoUrl: string;
}

interface AnalysisResult {
  hashtag: string;
  metrics: {
    totalSubmitted: number;
    totalQualified: number;
  };
  videos: QualifiedVideo[];
}

export default function Dashboard() {
  const [urlsInput, setUrlsInput] = useState('');
  const [hashtag, setHashtag] = useState('web3');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const urlArray = urlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    try {
      const res = await fetch('/api/tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrls: urlArray,
          targetHashtag: hashtag,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses video');

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            TikTok Post Verifier Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Verifikasi kelayakan postingan peserta kampanye berdasarkan keberadaan hashtag secara gratis.
          </p>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Hashtag Syarat Kampanye
            </label>
            <input
              type="text"
              placeholder="misal: web3"
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Daftar Link Video TikTok (1 URL per baris)
            </label>
            <textarea
              rows={5}
              placeholder={`https://www.tiktok.com/@user/video/123456789\nhttps://www.tiktok.com/@user/video/987654321`}
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-semibold py-3 rounded-xl text-sm transition-all"
          >
            {loading ? 'Memproses Data...' : 'Verifikasi Postingan'}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Hasil Analytics & Cards */}
        {result && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Link Diperiksa
                </span>
                <div className="text-3xl font-black mt-2 text-white">
                  {result.metrics.totalSubmitted} <span className="text-sm font-normal text-slate-500">video</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Lolos Syarat Hashtag ({result.hashtag})
                </span>
                <div className="text-3xl font-black mt-2 text-cyan-400">
                  {result.metrics.totalQualified} <span className="text-sm font-normal text-slate-500">video Valid</span>
                </div>
              </div>
            </div>

            {/* List Video Card Valid */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Daftar Video Lolos Syarat</h2>

              {result.videos.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
                  Tidak ada video yang ditemukan mengandung hashtag {result.hashtag}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.videos.map((vid) => (
                    <div
                      key={vid.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={vid.coverUrl}
                          alt="Thumbnail"
                          className="w-24 h-32 object-cover rounded-xl border border-slate-800 shrink-0"
                        />
                        <div className="space-y-2">
                          <a
                            href={vid.authorUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-cyan-400 hover:underline"
                          >
                            @{vid.authorName}
                          </a>
                          <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed">
                            {vid.title}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 pt-3 flex justify-end">
                        <a
                          href={vid.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                        >
                          Tonton di TikTok ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}