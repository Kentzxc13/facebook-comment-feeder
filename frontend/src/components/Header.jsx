import React from 'react';
import { MessageSquareText, ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="app-header">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <MessageSquareText size={26} />
        </div>
        <div className="brand-titles">
          <h1>Facebook Comment Feeder</h1>
          <p>Extract, anonymize, and export comments directly to Excel</p>
        </div>
      </div>
      <div className="header-badges">
        <span className="badge badge-live">
          <span className="badge-dot" />
          Playwright Engine Ready
        </span>
        <span className="badge">
          <ShieldCheck size={14} />
          Blind Review Mode
        </span>
      </div>
    </header>
  );
}
