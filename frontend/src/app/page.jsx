'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquareText,
  ShieldCheck,
  Link2,
  Sparkles,
  Loader2,
  AlertCircle,
  Search,
  Download,
  Users,
  MessageSquare,
  Activity,
  Inbox,
  SearchX,
  User,
  Zap,
  Cloud,
  Key,
  ExternalLink
} from 'lucide-react';
import { anonymizeComments } from '../utils/anonymizer.js';
import { exportToExcel } from '../utils/excelExporter.js';

export default function Home() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('default'); // 'default' | 'advanced'
  const [apiKey, setApiKey] = useState('');
  const [hasServerToken, setHasServerToken] = useState(false);
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [rawComments, setRawComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [isAnonymized, setIsAnonymized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState('Idle');

  const pollIntervalRef = useRef(null);

  // Check backend health and server-side .env token
  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => {
        if (data.hasApiToken) setHasServerToken(true);
      })
      .catch(() => {});

    try {
      const saved = localStorage.getItem('fb_cf_apify_token');
      if (saved) setApiKey(saved);
    } catch {}
  }, []);

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    try {
      localStorage.setItem('fb_cf_apify_token', val);
    } catch {}
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Format comments with consistent pseudonyms
  const formattedComments = useMemo(() => {
    return anonymizeComments(rawComments, isAnonymized);
  }, [rawComments, isAnonymized]);

  // Unique authors count
  const uniqueAuthorsCount = useMemo(() => {
    const authors = new Set(rawComments.map(c => c.author));
    return authors.size;
  }, [rawComments]);

  // Filtered comments
  const displayedComments = useMemo(() => {
    if (!searchTerm.trim()) return formattedComments;
    const term = searchTerm.toLowerCase();
    return formattedComments.filter(
      c => c.author.toLowerCase().includes(term) || c.text.toLowerCase().includes(term)
    );
  }, [formattedComments, searchTerm]);

  // Trigger Scrape Job
  const handleFetch = async (e) => {
    if (e) e.preventDefault();
    if (!url.trim() || isLoading) return;

    setError('');
    setIsLoading(true);
    setStatus('Initializing');
    setProgress('Submitting Facebook post...');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          mode,
          apiKey: mode === 'advanced' ? apiKey.trim() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate scrape job.');
      }

      const jobId = data.jobId;
      setStatus('Scraping');
      setProgress('Scraper job started...');

      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/jobs/${jobId}`);
          if (!pollRes.ok) return;

          const job = await pollRes.json();
          if (job.progress) setProgress(job.progress);

          if (job.status === 'completed') {
            clearInterval(pollIntervalRef.current);
            setRawComments(job.comments || []);
            setIsLoading(false);
            setStatus('Completed');
            setProgress(`Done! Extracted ${job.comments?.length || 0} comments.`);
          } else if (job.status === 'failed') {
            clearInterval(pollIntervalRef.current);
            setIsLoading(false);
            setStatus('Failed');
            setError(job.error || 'Failed to extract comments.');
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 2000);
    } catch (err) {
      setIsLoading(false);
      setStatus('Error');
      setError(err.message || 'Network error occurred.');
    }
  };

  // Download Excel
  const handleDownload = async () => {
    if (rawComments.length === 0) return;
    setIsDownloading(true);
    try {
      await exportToExcel(rawComments, isAnonymized);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-8 mb-8 border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <MessageSquareText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Facebook Comment Feeder
            </h1>
            <p className="text-sm text-slate-400">
              Extract, anonymize, and export comments directly to Excel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Playwright Ready
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.04] text-slate-400 border border-white/[0.08]">
            <ShieldCheck size={14} className="text-indigo-400" />
            Blind Review Mode
          </span>
        </div>
      </header>

      {/* URL Input Bar */}
      <section className="bg-[#111726]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl p-6 sm:p-7 mb-8 shadow-card focus-within:border-indigo-500/50 transition-all">
        <form onSubmit={handleFetch}>
          {/* Scraper Mode Segmented Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="inline-flex p-1 bg-[#090d16] border border-white/[0.08] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setMode('default')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  mode === 'default'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap size={14} className={mode === 'default' ? 'text-amber-300' : ''} />
                <span>Default (Free / Local)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('advanced')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  mode === 'advanced'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cloud size={14} className={mode === 'advanced' ? 'text-cyan-300' : ''} />
                <span>Advanced (Cloud API)</span>
              </button>
            </div>

            <div className="text-xs text-slate-400">
              {mode === 'default' ? (
                <span className="text-slate-400">⚡ Best for regular posts (&lt; 100 comments) • Free</span>
              ) : (
                <span className="text-cyan-400 font-medium">🚀 Best for large threads (100+ comments)</span>
              )}
            </div>
          </div>

          {/* Advanced Mode API Key Status & Input Bar */}
          {mode === 'advanced' && (
            <div className="mb-5">
              {hasServerToken && !showOverrideInput ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <span>
                      Apify Cloud API Token is <strong>connected</strong> from your <code className="px-1 py-0.5 rounded bg-emerald-950/60 font-mono text-emerald-300">.env</code> file. Ready to extract!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOverrideInput(true)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline shrink-0 ml-3"
                  >
                    Change Key
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/25 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                    <label className="flex items-center gap-1.5 font-medium text-slate-200">
                      <Key size={14} className="text-violet-400" />
                      <span>Apify API Token (Optional if configured in .env)</span>
                    </label>
                    <div className="flex items-center gap-3">
                      {hasServerToken && (
                        <button
                          type="button"
                          onClick={() => setShowOverrideInput(false)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                        >
                          Use .env Token
                        </button>
                      )}
                      <a
                        href="https://console.apify.com/account/integrations"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        <span>Get Free Token</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                  <input
                    type="password"
                    placeholder="Enter your apify_api_... token (persisted locally in browser)"
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090d16]/90 border border-white/[0.08] rounded-lg text-slate-200 placeholder-slate-500 text-xs outline-none focus:border-violet-500 transition-all font-mono"
                  />
                  <p className="mt-2 text-[11px] text-slate-400">
                    Apify provides $5 free monthly credit. If left empty, the backend will check for <code className="text-slate-300 font-mono">APIFY_API_TOKEN</code> in your environment.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 flex items-center">
              <Link2 className="absolute left-4 text-slate-500 pointer-events-none" size={18} />
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3.5 bg-[#090d16]/90 border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 text-sm sm:text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Paste Facebook post URL (e.g., https://www.facebook.com/...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Fetch Comments</span>
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {isLoading && (
          <div className="mt-4 p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Loader2 size={16} className="animate-spin text-indigo-400" />
              <span>{progress || 'Processing request...'}</span>
            </div>
          </div>
        )}
      </section>

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111726]/80 backdrop-blur-md border border-white/[0.08] rounded-xl p-5 flex items-center gap-4 hover:border-white/[0.14] transition-all">
          <div className="w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Comments</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{rawComments.length}</div>
          </div>
        </div>

        <div className="bg-[#111726]/80 backdrop-blur-md border border-white/[0.08] rounded-xl p-5 flex items-center gap-4 hover:border-white/[0.14] transition-all">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Users size={22} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Unique Authors</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{uniqueAuthorsCount}</div>
          </div>
        </div>

        <div className="bg-[#111726]/80 backdrop-blur-md border border-white/[0.08] rounded-xl p-5 flex items-center gap-4 hover:border-white/[0.14] transition-all">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Activity size={22} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Status</div>
            <div className="text-lg font-bold text-white capitalize">{status}</div>
          </div>
        </div>
      </section>

      {/* Controls Bar */}
      <section className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Anonymize Toggle Switch */}
          <div
            onClick={() => setIsAnonymized(prev => !prev)}
            role="switch"
            aria-checked={isAnonymized}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setIsAnonymized(prev => !prev);
              }
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#111726]/80 border border-white/[0.08] hover:border-indigo-500/40 cursor-pointer select-none transition-all"
          >
            <div className={`w-9 h-5 rounded-full relative transition-colors ${isAnonymized ? 'bg-indigo-600' : 'bg-slate-700'}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] left-[3px] transition-transform ${isAnonymized ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm font-medium text-slate-200">
              {isAnonymized ? 'Blind Check Active' : 'Mask Commenter Names'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAnonymized ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
              {isAnonymized ? 'Commenter #1, #2...' : 'Off'}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter comments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-3.5 py-2 bg-[#111726]/80 border border-white/[0.08] rounded-full text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Download Excel Button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={rawComments.length === 0 || isDownloading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
        >
          <Download size={16} />
          <span>{isDownloading ? 'Generating Excel...' : 'Download Excel (.xlsx)'}</span>
        </button>
      </section>

      {/* Comments Data Table */}
      <section className="bg-[#111726]/80 backdrop-blur-md border border-white/[0.08] rounded-2xl overflow-hidden shadow-card">
        {rawComments.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Inbox size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">Ready to Absorb Comments</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Paste a public Facebook post link above and click "Fetch Comments" to start.
            </p>
          </div>
        ) : displayedComments.length === 0 && searchTerm.trim() ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3 text-slate-400">
              <SearchX size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">No Matching Comments</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No comments match your search filter. Try clearing or changing the search term.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0c1220] border-b border-white/[0.08] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">#</th>
                  <th className="py-3.5 px-4 w-48">Date (MM/DD/YYYY)</th>
                  <th className="py-3.5 px-4 w-52">Commenter</th>
                  <th className="py-3.5 px-4">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {displayedComments.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-center text-xs font-mono text-slate-500 tabular-nums">
                      {item.no}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 font-medium ${
                        isAnonymized
                          ? 'px-2.5 py-1 rounded-full text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/25'
                          : 'text-slate-200'
                      }`}>
                        <User size={13} className="shrink-0 text-slate-400" />
                        <span>{item.author}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 leading-relaxed break-words">
                      {item.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
