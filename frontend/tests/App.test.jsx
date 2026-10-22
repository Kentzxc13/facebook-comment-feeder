import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App.jsx';

describe('App Dashboard', () => {
  it('renders title, URL input, fetch button, and anonymize toggle', () => {
    render(<App />);
    expect(screen.getByText(/Facebook Comment Feeder/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Paste Facebook post URL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fetch Comments/i })).toBeInTheDocument();
  });
});
