'use client';

import { useState } from 'react';

interface VideoItem {
  id: string;
  title: string;
  authorName: string;
  authorUrl: string;
  coverUrl: string;
  videoUrl: string;
  views: number;
}

interface CreatorGroup {
  authorName: string;
  authorUrl: string;
  totalViews: number;
  videos: VideoItem[];
}

interface AnalysisResult {
  hashtag: string;
  globalMetrics: {
    totalSubmitted: number;
    totalQualified: number;
    totalViews: number;
    totalCreators: number;
  };
  creators: CreatorGroup[];
}

export default function Home() {
  const [hashtag, setHashtag] = useState('BertamuSpecial');
  const [urlsInput, setUrlsInput] = useState(
    'https://www.tiktok.com/@marapthon_thelast/video/7676695513533517077\nhttps://vt.tiktok.com/ZSVabx3UG/\nhttps://vt.tiktok.com/ZSVabPevR/'
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    const videoUrls = urlsInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (videoUrls.length === 0) {
      setError('Harap masukkan minimal 1 URL video TikTok.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrls, targetHashtag: hashtag }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat memproses data');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Gagal menghubungi server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header / Branding */}
        <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-[#00d2ff] items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Bola Mata Currency Analytics
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              TikTok Campaign Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Verifikasi postingan & agregasi performa per kreator secara otomatis.
            </p>
          </div>
        </header>

        {/* Form Input */}
        <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-6 shadow-xl space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Hashtag Syarat Kampanye
            </label>
            <input
              type="text"
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              placeholder="Contoh: BertamuSpecial"
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Daftar Link Video TikTok (1 URL Per Baris)
            </label>
            <textarea
              rows={4}
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              placeholder="https://www.tiktok.com/@username/video/123456789"
              className="w-full bg-[#0b0f19] border border-slate-700 rounded-lg p-4 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white font-medium py-3 px-6 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses Data TikTok...
              </>
            ) : (
              'Verifikasi & Kelompokkan Per Username'
            )}
          </button>
        </div>

        {/* Dashboard Metrics Overview */}
        {result && (
          <div className="space-y-8 animate-fadeIn">
            {/* Global Metrics Cards */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                📊 Ringkasan Performa Kampanye ({result.hashtag})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#131b2e] border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">TOTAL DIPERIKSA</p>
                  <p className="text-2xl font-bold text-white mt-2">{result.globalMetrics.totalSubmitted} <span className="text-xs font-normal text-slate-400">video</span></p>
                </div>
                <div className="bg-[#131b2e] border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">LOLOS SYARAT HASHTAG</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">{result.globalMetrics.totalQualified} <span className="text-xs font-normal text-slate-400">valid</span></p>
                </div>
                <div className="bg-[#131b2e] border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">TOTAL KREATOR</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-2">{result.globalMetrics.totalCreators} <span className="text-xs font-normal text-slate-400">username</span></p>
                </div>
                <div className="bg-[#131b2e] border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">ESTIMASI TOTAL VIEWS</p>
                  <p className="text-2xl font-bold text-amber-400 mt-2">{result.globalMetrics.totalViews.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">views</span></p>
                </div>
              </div>
            </div>

            {/* Breakdown Per Username */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                👥 Performa Per Username TikTok
              </h2>

              {result.creators.length === 0 ? (
                <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                  Tidak ada video yang memenuhi syarat hashtag <span className="text-cyan-400 font-semibold">{result.hashtag}</span>.
                </div>
              ) : (
                result.creators.map((creator, idx) => (
                  <div key={idx} className="bg-[#131b2e] border border-slate-800 rounded-xl p-6 space-y-4">
                    
                    {/* Username Header & Stats */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
                      <div>
                        <a
                          href={creator.authorUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-lg font-bold text-cyan-400 hover:underline flex items-center gap-1.5"
                        >
                          @{creator.authorName}
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                        <p className="text-xs text-slate-400 mt-0.5">Kreator Terverifikasi</p>
                      </div>

                      {/* Username Dashboard Metrics */}
                      <div className="flex gap-4 bg-[#0b0f19] px-4 py-2 rounded-lg border border-slate-800 text-xs">
                        <div>
                          <span className="text-slate-400 block">Total Video</span>
                          <span className="font-bold text-white text-sm">{creator.videos.length} Video</span>
                        </div>
                        <div className="border-l border-slate-800 pl-4">
                          <span className="text-slate-400 block">Total Views</span>
                          <span className="font-bold text-amber-400 text-sm">{creator.totalViews.toLocaleString('id-ID')} Views</span>
                        </div>
                      </div>
                    </div>

                    {/* Cards Video Milik Username Ini */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {creator.videos.map((vid) => (
                        <div key={vid.id} className="bg-[#0b0f19] border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors">
                          <div className="flex gap-3">
                            <img
                              src={vid.coverUrl}
                              alt="Cover"
                              className="w-20 h-28 object-cover rounded-md border border-slate-800 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                                {vid.title}
                              </p>
                              <div className="inline-block bg-amber-950/40 text-amber-400 text-[11px] font-medium px-2 py-0.5 rounded border border-amber-900/50 mt-1">
                                {vid.views.toLocaleString('id-ID')} Views
                              </div>
                            </div>
                          </div>
                          
                          <a
                            href={vid.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 text-center text-xs text-cyan-400 hover:text-cyan-300 font-medium py-1.5 bg-slate-900/80 rounded border border-slate-800 hover:border-cyan-900/50 transition-colors"
                          >
                            Tonton di TikTok ↗
                          </a>
                        </div>
                      ))}
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}