import React from 'react';
import { User, Inbox, SearchX } from 'lucide-react';

export function CommentsTable({ comments, isAnonymized, hasFiltered, totalUnfiltered }) {
  if (totalUnfiltered === 0) {
    return (
      <div className="table-card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Inbox size={28} />
          </div>
          <h3>Ready to Absorb Comments</h3>
          <p>Paste a public Facebook post link above and click "Fetch Comments" to start.</p>
        </div>
      </div>
    );
  }

  if (comments.length === 0 && hasFiltered) {
    return (
      <div className="table-card">
        <div className="empty-state">
          <div className="empty-state-icon">
            <SearchX size={28} />
          </div>
          <h3>No Matching Comments</h3>
          <p>No comments matched your filter keyword. Try a different search term.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-responsive">
        <table className="comments-table">
          <thead>
            <tr>
              <th className="col-no">#</th>
              <th className="col-date">Date</th>
              <th className="col-author">Commenter</th>
              <th className="col-text">Comment</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((item) => (
              <tr key={item.id}>
                <td className="col-no">{item.no}</td>
                <td className="col-date">{item.date}</td>
                <td className="col-author">
                  <span className={`author-pill ${isAnonymized ? 'anonymized' : ''}`}>
                    <User size={13} />
                    <span>{item.author}</span>
                  </span>
                </td>
                <td className="col-text">{item.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
