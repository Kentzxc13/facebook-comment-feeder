import React, { useState, useMemo, useEffect, useRef } from 'react';
import './App.css';
import { Header } from './components/Header.jsx';
import { UrlInput } from './components/UrlInput.jsx';
import { MetricsCards } from './components/MetricsCards.jsx';
import { ControlsBar } from './components/ControlsBar.jsx';
import { CommentsTable } from './components/CommentsTable.jsx';
import { anonymizeComments } from './utils/anonymizer.js';
import { exportToExcel } from './utils/excelExporter.js';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [url, setUrl] = useState('');
  const [rawComments, setRawComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [isAnonymized, setIsAnonymized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [status, setStatus] = useState('Idle');

  const pollIntervalRef = useRef(null);

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Compute formatted comments with deterministic pseudonym mapping
  const formattedComments = useMemo(() => {
    return anonymizeComments(rawComments, isAnonymized);
  }, [rawComments, isAnonymized]);

  // Compute unique authors count
  const uniqueAuthorsCount = useMemo(() => {
    const authors = new Set(rawComments.map(c => c.author));
    return authors.size;
  }, [rawComments]);

  // Filter comments live by search term
  const displayedComments = useMemo(() => {
    if (!searchTerm.trim()) return formattedComments;
    const term = searchTerm.toLowerCase();
    return formattedComments.filter(
      c => c.author.toLowerCase().includes(term) || c.text.toLowerCase().includes(term)
    );
  }, [formattedComments, searchTerm]);

  // Handle Fetch Comments
  const handleFetch = async () => {
    setError('');
    setIsLoading(true);
    setStatus('Initializing');
    setProgress('Submitting Facebook post...');

    try {
      const res = await fetch(`${API_BASE}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate scrape job.');
      }

      const jobId = data.jobId;
      setStatus('Scraping');
      setProgress('Scraper job started...');

      // Begin polling
      pollIntervalRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`${API_BASE}/api/jobs/${jobId}`);
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

  // Handle Excel Export
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
    <div className="app-container">
      <Header />

      <UrlInput
        url={url}
        setUrl={setUrl}
        onSubmit={handleFetch}
        isLoading={isLoading}
        progress={progress}
        error={error}
      />

      <MetricsCards
        totalComments={rawComments.length}
        uniqueCommenters={uniqueAuthorsCount}
        status={status}
      />

      <ControlsBar
        isAnonymized={isAnonymized}
        onToggleAnonymize={() => setIsAnonymized(prev => !prev)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onDownload={handleDownload}
        hasData={rawComments.length > 0}
        isDownloading={isDownloading}
      />

      <CommentsTable
        comments={displayedComments}
        isAnonymized={isAnonymized}
        hasFiltered={Boolean(searchTerm.trim())}
        totalUnfiltered={rawComments.length}
      />
    </div>
  );
}
