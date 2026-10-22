import React from 'react';
import { Link2, Sparkles, Loader2, AlertCircle } from 'lucide-react';

export function UrlInput({ url, setUrl, onSubmit, isLoading, progress, error }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onSubmit();
    }
  };

  return (
    <div className="input-card">
      <form onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <div className="input-field-container">
            <Link2 className="input-field-icon" size={18} />
            <input
              type="text"
              className="url-input"
              placeholder="Paste Facebook post URL (e.g., https://www.facebook.com/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="btn-fetch"
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spinner" />
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
        <div className="error-banner">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {isLoading && (
        <div className="progress-banner">
          <div className="progress-text">
            <Loader2 size={16} className="spinner" />
            <span>{progress || 'Processing request...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
