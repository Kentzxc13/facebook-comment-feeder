import React from 'react';
import { MessageSquare, Users, Activity } from 'lucide-react';

export function MetricsCards({ totalComments, uniqueCommenters, status }) {
  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-icon-box" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8' }}>
          <MessageSquare size={22} />
        </div>
        <div className="metric-info">
          <h3>Total Comments</h3>
          <div className="metric-val">{totalComments}</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399' }}>
          <Users size={22} />
        </div>
        <div className="metric-info">
          <h3>Unique Authors</h3>
          <div className="metric-val">{uniqueCommenters}</div>
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24' }}>
          <Activity size={22} />
        </div>
        <div className="metric-info">
          <h3>Status</h3>
          <div className="metric-val" style={{ fontSize: '1rem', textTransform: 'capitalize' }}>
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
