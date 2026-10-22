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
  Copy,
  Check,
  X
} from 'lucide-react';
import { anonymizeComments } from '../utils/anonymizer.js';
import { exportToExcel } from '../utils/excelExporter.js';

export default function Home() {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('default'); // 'default' | 'advanced'
  const [rawComments, setRawComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [isAnonymized, setIsAnonymized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [copiedId, setCopiedId] = useState(null);

  const pollIntervalRef = useRef(null);

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
    setProgress(mode === 'advanced' ? 'Connecting to Apify Cloud Scraper...' : 'Launching local Playwright browser...');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          mode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate scrape job.');
      }

      const jobId = data.jobId;
      setStatus('Scraping');

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

  // Copy Comment Text Helper
  const handleCopy = (id, text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 pb-8 mb-8 border-b border-white/[0.07]">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-0.5 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0d1322] rounded-[14px] flex items-center justify-center text-indigo-400">
              <MessageSquareText size={26} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Facebook Comment Feeder
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v2.0
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Extract public post discussions, apply blind review masking, and export to Excel.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Engines Ready</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.04] text-slate-300 border border-white/[0.08]">
            <ShieldCheck size={14} className="text-indigo-400" />
            <span>Blind Review Support</span>
          </div>
        </div>
      </header>

      {/* Main Action Card */}
      <section className="bg-[#0e1424]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 sm:p-7 mb-8 shadow-2xl shadow-black/40 transition-all">
        <form onSubmit={handleFetch}>
          {/* Scraper Mode Segmented Pill Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div className="inline-flex p-1 bg-[#070b14] border border-white/[0.08] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setMode('default')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  mode === 'default'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap size={14} className={mode === 'default' ? 'text-amber-300 fill-amber-300/20' : ''} />
                <span>Default (Free / Local)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('advanced')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  mode === 'advanced'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cloud size={14} className={mode === 'advanced' ? 'text-cyan-300 fill-cyan-300/20' : ''} />
                <span>Advanced (Cloud API)</span>
              </button>
            </div>

            <div className="text-xs text-slate-400">
              {mode === 'default' ? (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Runs headless Chromium on your device • 100% Free
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Cloud Actor enabled via .env token • Best for 100+ comments
                </span>
              )}
            </div>
          </div>

          {/* URL Input Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 flex items-center">
              <Link2 className="absolute left-4 text-slate-500 pointer-events-none" size={18} />
              <input
                type="text"
                className="w-full pl-11 pr-10 py-3.5 bg-[#070b14] border border-white/[0.08] rounded-xl text-slate-100 placeholder-slate-500 text-sm sm:text-base outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition-all"
                placeholder="Paste Facebook post URL (e.g., https://www.facebook.com/...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
              {url && !isLoading && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="absolute right-3.5 text-slate-500 hover:text-slate-300 p-1 rounded-md transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-white" />
                  <span>Extracting Comments...</span>
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

        {/* Error Feedback */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertCircle size={18} className="shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-200 mb-0.5">Scraping Error</div>
              <div className="text-red-300/90 text-xs leading-relaxed">{error}</div>
            </div>
          </div>
        )}

        {/* Real-Time Extraction Status Bar */}
        {isLoading && (
          <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-sm flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-indigo-400 shrink-0" />
              <div>
                <span className="font-medium text-indigo-200">{progress || 'Processing request...'}</span>
                <span className="block text-xs text-indigo-400/80 mt-0.5">Unfolding comments, authors, and relative timestamps...</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Metrics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0e1424]/80 backdrop-blur-md border border-white/[0.07] rounded-xl p-5 flex items-center gap-4 hover:border-white/[0.12] transition-all">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Comments</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{rawComments.length}</div>
          </div>
        </div>

        <div className="bg-[#0e1424]/80 backdrop-blur-md border border-white/[0.07] rounded-xl p-5 flex items-center gap-4 hover:border-white/[0.12] transition-all">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Users size={22} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Unique Commenters</div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">{uniqueAuthorsCount}</div>
          </div>
        </div>

        <div className="bg-[#0e1424]/80 backdrop-blur-md border border-white/[0.07] rounded-xl p-5 flex items-center gap-4 hover:border-white/[0.12] transition-all">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Activity size={22} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Active Engine</div>
            <div className="text-base font-bold text-white capitalize flex items-center gap-1.5 mt-0.5">
              <span>{mode === 'default' ? 'Local Playwright' : 'Apify Cloud'}</span>
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
            </div>
          </div>
        </div>
      </section>

      {/* Controls & Filter Toolbar */}
      <section className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Anonymize Blind Check Toggle */}
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
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-[#0e1424] border border-white/[0.08] hover:border-indigo-500/40 cursor-pointer select-none transition-all shadow-sm"
          >
            <div className={`w-9 h-5 rounded-full relative transition-colors ${isAnonymized ? 'bg-indigo-600' : 'bg-slate-700'}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] left-[3px] transition-transform ${isAnonymized ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-xs sm:text-sm font-medium text-slate-200">
              {isAnonymized ? 'Blind Check Masking' : 'Mask Commenter Names'}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${isAnonymized ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
              {isAnonymized ? 'Active' : 'Off'}
            </span>
          </div>

          {/* Search Filter */}
          <div className="relative flex items-center flex-1 sm:flex-initial">
            <Search size={15} className="absolute left-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search comments or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-60 pl-9 pr-3.5 py-2.5 bg-[#0e1424] border border-white/[0.08] rounded-full text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 text-slate-500 hover:text-slate-300"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Result Count Indicator */}
          {rawComments.length > 0 && (
            <span className="text-xs text-slate-400 ml-1">
              Showing <strong className="text-slate-200 tabular-nums">{displayedComments.length}</strong> of {rawComments.length}
            </span>
          )}
        </div>

        {/* Download Excel Button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={rawComments.length === 0 || isDownloading}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all"
        >
          <Download size={16} />
          <span>{isDownloading ? 'Generating Excel...' : 'Download Excel (.xlsx)'}</span>
        </button>
      </section>

      {/* Comments Data Table */}
      <section className="bg-[#0e1424]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
        {rawComments.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <Inbox size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">Ready to Feed Comments</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Paste a public Facebook post link in the bar above and select your mode to extract full comments, timestamps, and usernames.
            </p>
          </div>
        ) : displayedComments.length === 0 && searchTerm.trim() ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3 text-slate-400">
              <SearchX size={26} />
            </div>
            <h3 className="text-base font-semibold text-slate-300 mb-1">No Matching Comments</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No comments match &ldquo;{searchTerm}&rdquo;. Try clearing or changing the search term.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#090d18] border-b border-white/[0.08] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-4 text-center w-14">#</th>
                  <th className="py-4 px-4 w-48">Date (MM/DD/YYYY)</th>
                  <th className="py-4 px-4 w-56">Commenter</th>
                  <th className="py-4 px-4">Comment</th>
                  <th className="py-4 px-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-sm">
                {displayedComments.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.025] group transition-colors">
                    <td className="py-3.5 px-4 text-center text-xs font-mono text-slate-500 tabular-nums">
                      {item.no}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400 whitespace-nowrap tabular-nums">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 font-medium ${
                        isAnonymized
                          ? 'px-2.5 py-1 rounded-full text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-200'
                      }`}>
                        <User size={13} className="shrink-0 text-slate-400" />
                        <span>{item.author}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 leading-relaxed break-words">
                      {item.text}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.text)}
                        title="Copy comment text"
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
                      >
                        {copiedId === item.id ? (
                          <Check size={14} className="text-emerald-400" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
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
