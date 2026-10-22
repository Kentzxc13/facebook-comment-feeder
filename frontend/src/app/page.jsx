'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  MessageSquareText,
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
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Columns,
  Calendar,
  ExternalLink,
  FileSpreadsheet
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pageSize, setPageSize] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPage, setJumpPage] = useState('1');

  const pollIntervalRef = useRef(null);
  const urlInputRef = useRef(null);

  // Dynamic API base: points to backend port 5000 in local dev
  const getApiBase = () => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    }
    return '';
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

  // Filtered comments
  const displayedComments = useMemo(() => {
    if (!searchTerm.trim()) return formattedComments;
    const term = searchTerm.toLowerCase();
    return formattedComments.filter(
      c => c.author.toLowerCase().includes(term) || c.text.toLowerCase().includes(term)
    );
  }, [formattedComments, searchTerm]);

  // Pagination Calculations
  const totalPages = Math.ceil(displayedComments.length / pageSize) || 1;

  const paginatedComments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayedComments.slice(start, start + pageSize);
  }, [displayedComments, currentPage, pageSize]);

  // Reset to page 1 on filter or pageSize change
  useEffect(() => {
    setCurrentPage(1);
    setJumpPage('1');
  }, [searchTerm, pageSize]);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allCurrent = new Set(paginatedComments.map(c => c.id));
      setSelectedIds(allCurrent);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = paginatedComments.length > 0 && paginatedComments.every(c => selectedIds.has(c.id));

  // Trigger Scrape Job
  const handleFetch = async (e) => {
    if (e) e.preventDefault();
    if (isLoading) return;

    if (!url.trim()) {
      setError('Please enter or paste a public Facebook post URL first.');
      urlInputRef.current?.focus();
      return;
    }

    setError('');
    setIsLoading(true);
    setStatus('Initializing');
    setProgress(mode === 'advanced' ? 'Connecting to Apify Cloud Scraper...' : 'Launching Playwright scraper session...');

    const apiBase = getApiBase();

    try {
      const res = await fetch(`${apiBase}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          mode
        })
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server returned HTTP ${res.status}. Could not connect to comment scraper backend.`);
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to initiate scrape job.');
      }

      const jobId = data.jobId;
      setStatus('Scraping');

      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`${apiBase}/api/jobs/${jobId}`);
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
      // If user selected specific rows, export those; otherwise export all
      const exportSet = selectedIds.size > 0
        ? rawComments.filter(c => selectedIds.has(c.id))
        : rawComments;
      await exportToExcel(exportSet, isAnonymized);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  // 1-Click Copy
  const handleCopy = (id, text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  // Page jump
  const handleJumpPage = (e) => {
    const val = parseInt(e.target.value, 10);
    setJumpPage(e.target.value);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] rounded-3xl bg-white border border-slate-200/90 shadow-[0_12px_40px_-15px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col min-h-[92vh]">
      {/* BEGIN: Clean Top Navigation Bar */}
      <header className="border-b border-slate-200/80 bg-white px-6 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#ff5733] to-amber-500 flex items-center justify-center text-white shadow-sm shadow-[#ff5733]/25">
              <MessageSquareText size={20} />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              CommentFeeder
              <span className="bg-orange-50 text-[#ff5733] border border-orange-200/80 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full">
                v2.4
              </span>
            </span>
          </div>
        </div>
      </header>
      {/* END: Top Navigation Bar */}

      {/* BEGIN: Page Header & Meta Section */}
      <section className="px-8 pt-7 pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Page Title & Meta context */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 flex items-center gap-2.5">
              Facebook Comments Feed
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Live Feed
              </span>
            </h1>

            <p className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[#1877F2] font-medium">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Target:
              </span>
              <span className="font-mono text-slate-700 font-medium truncate max-w-xs sm:max-w-md">
                {url || 'Paste a post link to get started...'}
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700">{rawComments.length} comments extracted</span>
              <span className="text-slate-300">•</span>
              <span className="text-emerald-600 font-medium">Status: {status}</span>
            </p>
          </div>

          {/* Right Action Group: Export Excel */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={rawComments.length === 0 || isDownloading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              <span>{isDownloading ? 'Generating...' : selectedIds.size > 0 ? `Export Selected (${selectedIds.size})` : 'Export All Data'}</span>
            </button>
          </div>
        </div>
      </section>
      {/* END: Page Header & Meta Section */}

      {/* BEGIN: URL Input Form Bar */}
      <section className="px-8 pb-3">
        <form onSubmit={handleFetch} className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 shadow-2xs">
          {/* Mode Selector Toggle Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 tracking-wider uppercase text-[11px]">
                Engine:
              </span>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setMode('default')}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'default'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-amber-400">⚡</span>
                  <span>Default</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    mode === 'default' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    ≤ 10 comments
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('advanced')}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'advanced'
                      ? 'bg-[#ff5733] text-white shadow-sm shadow-[#ff5733]/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>🚀</span>
                  <span>Cloud API</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                    mode === 'advanced' ? 'bg-[#e03d22] text-white' : 'bg-orange-50 text-orange-700 border border-orange-200/60'
                  }`}>
                    &gt; 10 comments
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Status Tag on top right of form */}
            <div className="hidden sm:flex items-center text-xs">
              {mode === 'advanced' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/80 text-amber-900 text-[11px] font-semibold border border-amber-300/80">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Apify Cloud Scraper Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-900 text-[11px] font-semibold border border-emerald-300/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Local Playwright Active
                </span>
              )}
            </div>
          </div>

          {/* URL Input Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 flex items-center">
              <Link2 className="absolute left-3.5 text-slate-400 pointer-events-none" size={16} />
              <input
                ref={urlInputRef}
                type="text"
                placeholder="Paste Facebook post URL (e.g., https://www.facebook.com/...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
                className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#ff5733] focus:ring-1 focus:ring-[#ff5733] transition-all shadow-xs"
              />
              {url && !isLoading && (
                <button
                  type="button"
                  onClick={() => setUrl('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff5733] hover:bg-[#ff4d30] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs px-6 py-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Extract Now</span>
                </>
              )}
            </button>
          </div>

          {/* Dynamic Live Disclaimer & Mode Info Banner */}
          <div className={`mt-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs transition-all duration-200 ${
            mode === 'advanced'
              ? 'bg-amber-50/90 border-amber-200 text-amber-950 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`font-bold flex items-center gap-1.5 ${
                mode === 'advanced' ? 'text-amber-800' : 'text-slate-900'
              }`}>
                {mode === 'default' ? '⚡ Default Engine:' : '🚀 Cloud API Engine:'}
              </span>
              <span className="text-xs">
                {mode === 'default'
                  ? 'Runs locally on your machine. Best for short posts with ≤ 10 comments. Fast, private, and 0 credits.'
                  : 'Deep-scrapes nested threads, replies, and hidden comments for long discussions with > 10 comments.'}
              </span>
            </div>

            <div className="shrink-0">
              {mode === 'advanced' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-[11px]">
                  ⚠️ Apify Quota: Limited monthly free credits (Max 250 comments / post)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                  ✓ Free Unlimited Local Extraction
                </span>
              )}
            </div>
          </div>

          {/* Loading / Error Banner */}
          {isLoading && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-800 flex items-center gap-2 animate-in fade-in">
              <Loader2 size={14} className="animate-spin text-[#ff5733]" />
              <span className="font-medium">{progress || 'Scraping comments and unfolding threads...'}</span>
            </div>
          )}

          {error && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={14} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </section>
      {/* END: URL Input Form Bar */}

      {/* BEGIN: Data Filters Toolbar (Mirroring reference layout) */}
      <div className="px-8 pb-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          {/* Left: Search input */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={14} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search comments or commenter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border-0 bg-transparent py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-[#ff5733]"
            />
          </div>

          {/* Right: Functional Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Blind Masking Toggle Switch */}
            <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 cursor-pointer hover:bg-slate-50 select-none transition-colors">
              <input
                type="checkbox"
                checked={isAnonymized}
                onChange={() => setIsAnonymized(prev => !prev)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-[#ff5733] focus:ring-[#ff5733]"
              />
              <span className="font-medium">Blind Masking</span>
            </label>

            {/* Date Format Pill */}
            <div className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              <Calendar size={13} className="text-slate-400" />
              <span>MM/DD/YYYY Format</span>
            </div>

            {/* Show Rows Dropdown */}
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 outline-none cursor-pointer"
              >
                <option value={8}>Show 8 Rows</option>
                <option value={15}>Show 15 Rows</option>
                <option value={25}>Show 25 Rows</option>
                <option value={50}>Show 50 Rows</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      {/* END: Data Filters Toolbar */}

      {/* BEGIN: Data Table Section */}
      <main className="flex-1 px-8 pb-4">
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-left border-collapse text-xs">
            {/* Table Column Headers */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 select-none">
                <th className="w-10 px-4 py-3 text-center" scope="col">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    disabled={paginatedComments.length === 0}
                    className="rounded border-slate-300 text-[#ff5733] focus:ring-[#ff5733]"
                  />
                </th>
                <th className="py-3 px-3 text-center w-12" scope="col">
                  #
                </th>
                <th className="py-3 px-3 w-48" scope="col">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800">
                    <span>DATE CREATED</span>
                    <span className="text-slate-400">↑↓</span>
                  </div>
                </th>
                <th className="py-3 px-3 w-52" scope="col">
                  <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800">
                    <span>COMMENTER</span>
                    <span className="text-slate-400">↑↓</span>
                  </div>
                </th>
                <th className="py-3 px-3" scope="col">
                  <span>COMMENT TEXT</span>
                </th>
                <th className="py-3 px-3 w-36" scope="col">
                  <span>THREAD TYPE</span>
                </th>
                <th className="w-20 px-3 py-3 text-right" scope="col">
                  <span>ACTIONS</span>
                </th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rawComments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#ff5733] flex items-center justify-center mx-auto mb-3 border border-orange-200/60">
                      <Inbox size={26} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Ready to Extract Comments</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Paste a public Facebook post link above and click &ldquo;Extract Now&rdquo; to populate this table.
                    </p>
                  </td>
                </tr>
              ) : paginatedComments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <SearchX size={22} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700">No matching comments</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Try clearing or changing your search keywords.</p>
                  </td>
                </tr>
              ) : (
                paginatedComments.map((item, idx) => {
                  const isChecked = selectedIds.has(item.id);
                  // Soft tag colors matching reference badges
                  const isReply = idx % 2 === 1;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isChecked ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded border-slate-300 text-[#ff5733] focus:ring-[#ff5733]"
                        />
                      </td>

                      {/* Row Number */}
                      <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-400 tabular-nums">
                        {item.no}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px] tabular-nums">
                        {item.date}
                      </td>

                      {/* Commenter Name */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            isAnonymized
                              ? 'px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200'
                              : 'text-slate-900'
                          }`}
                        >
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{item.author}</span>
                        </span>
                      </td>

                      {/* Comment Body */}
                      <td className="px-3 py-3 text-slate-800 leading-relaxed break-words">
                        {item.text}
                      </td>

                      {/* Thread Tag (matching reference asset class pills) */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {isReply ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200/60">
                            Reply Thread
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Top Comment
                          </span>
                        )}
                      </td>

                      {/* Action Icons */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 text-slate-400">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.id, item.text)}
                            title="Copy comment text"
                            className="hover:text-slate-900 transition-colors p-1 rounded hover:bg-slate-100"
                          >
                            {copiedId === item.id ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
      {/* END: Data Table Section */}

      {/* BEGIN: Table Pagination Footer (Direct match to reference) */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white px-8 py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          {/* Left: Summary count */}
          <div>
            <span>
              Showing{' '}
              <strong className="text-slate-800 font-semibold tabular-nums">
                {displayedComments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className="text-slate-800 font-semibold tabular-nums">
                {Math.min(currentPage * pageSize, displayedComments.length)}
              </strong>{' '}
              of <strong className="text-slate-800 font-semibold tabular-nums">{displayedComments.length}</strong> comments
              {selectedIds.size > 0 && (
                <span className="ml-2 text-orange-600 font-medium">({selectedIds.size} selected)</span>
              )}
            </span>
          </div>

          {/* Center: Numbered page navigation */}
          <div className="flex items-center gap-1.5">
            {/* Previous Button */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page Buttons */}
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-7 w-7 inline-flex items-center justify-center rounded-md font-medium text-xs transition-colors ${
                    isActive
                      ? 'border border-slate-300 bg-slate-100 font-bold text-slate-900 shadow-2xs'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-slate-400 select-none">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  className={`h-7 w-7 inline-flex items-center justify-center rounded-md font-medium text-xs ${
                    currentPage === totalPages
                      ? 'border border-slate-300 bg-slate-100 font-bold text-slate-900'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Next Button */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Right: Jump to page input */}
          <div className="flex items-center gap-2">
            <span>Go to page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={handleJumpPage}
              className="h-7 w-12 rounded-md border border-slate-200 text-center text-xs font-mono text-slate-800 py-0.5 px-1 focus:ring-1 focus:ring-[#ff5733] outline-none"
            />
          </div>
        </div>
      </footer>
      {/* END: Table Pagination Footer */}
    </div>
  );
}
