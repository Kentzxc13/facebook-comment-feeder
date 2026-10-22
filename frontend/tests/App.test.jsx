import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Home from '../src/app/page.jsx';

describe('App Dashboard', () => {
  it('renders title, URL input, and mode switcher', () => {
    render(<Home />);
    expect(screen.getByText(/Facebook Comments Feed/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste Facebook post URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Extract Now/i })).toBeInTheDocument();
  });

  it('switches between Default and Cloud API mode with quota notice', () => {
    render(<Home />);
    expect(screen.getByText(/Free Unlimited Local Scraping/i)).toBeInTheDocument();

    const cloudBtn = screen.getByRole('button', { name: /Cloud API/i });
    fireEvent.click(cloudBtn);

    expect(screen.getByText(/Apify Quota Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/Max 250 comments \/ post/i)).toBeInTheDocument();
  });
});
