import React from 'react';
import { Search, Download, ShieldCheck, ShieldAlert } from 'lucide-react';

export function ControlsBar({
  isAnonymized,
  onToggleAnonymize,
  searchTerm,
  onSearchChange,
  onDownload,
  hasData,
  isDownloading
}) {
  return (
    <div className="controls-bar">
      <div className="controls-left">
        {/* Anonymize Toggle Switch */}
        <div
          className="toggle-wrapper"
          onClick={onToggleAnonymize}
          role="switch"
          aria-checked={isAnonymized}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onToggleAnonymize();
            }
          }}
        >
          <div className={`toggle-switch ${isAnonymized ? 'active' : ''}`}>
            <div className="toggle-slider" />
          </div>
          <span className="toggle-label">
            {isAnonymized ? 'Blind Check Active' : 'Mask Commenter Names'}
          </span>
          <span className="toggle-badge">
            {isAnonymized ? 'Commenter #1, #2...' : 'Off'}
          </span>
        </div>

        {/* Live Search */}
        <div className="search-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Filter comments..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Download Excel Button */}
      <button
        type="button"
        className="btn-download"
        onClick={onDownload}
        disabled={!hasData || isDownloading}
      >
        <Download size={16} />
        <span>{isDownloading ? 'Generating Excel...' : 'Download Excel (.xlsx)'}</span>
      </button>
    </div>
  );
}
