import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../src/app/page.jsx';

describe('App Dashboard', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hasToken: true,
        usedUsd: 0.54,
        limitUsd: 5.00,
        remainingUsd: 4.46,
        percentageUsed: 10.7,
        resetDate: 'Nov 22, 2026'
      })
    });
  });
  it('renders title, URL input, and mode switcher', () => {
    render(<Home />);
    expect(screen.getByText(/Facebook Comments Feed/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste Facebook post URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Extract Now/i })).toBeInTheDocument();
  });

  it('switches between Default and Cloud API mode with quota notice', () => {
    render(<Home />);
    expect(screen.getByText(/Free Unlimited Local/i)).toBeInTheDocument();

    const cloudBtn = screen.getByRole('button', { name: /Cloud API/i });
    fireEvent.click(cloudBtn);

    expect(screen.getByText(/Free Tier Limit/i)).toBeInTheDocument();
    expect(screen.getByText(/Usage:/i)).toBeInTheDocument();
  });
});
