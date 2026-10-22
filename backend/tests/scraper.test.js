import { describe, it, expect } from 'vitest';
import { parseCommentNode, parseAriaCommentLabel } from '../src/scraper.js';

describe('parseCommentNode', () => {
  it('extracts author, timestamp, and text from mock comment object', () => {
    const raw = {
      authorText: 'John Doe',
      dateText: '2 hrs ago',
      bodyText: 'Great post! Keep it up!'
    };
    const parsed = parseCommentNode(raw);
    expect(parsed.author).toBe('John Doe');
    expect(parsed.date).toBe('2 hrs ago');
    expect(parsed.text).toBe('Great post! Keep it up!');
  });

  it('handles empty or missing fields cleanly without crashing', () => {
    const parsed = parseCommentNode({
      authorText: '',
      dateText: '',
      bodyText: ''
    });
    expect(parsed.author).toBe('Unknown');
    expect(parsed.date).toBe('Unknown');
    expect(parsed.text).toBe('');
  });

  it('cleans UI artifacts like "Reply", "Like", "Edited" from text if present', () => {
    const parsed = parseCommentNode({
      authorText: 'Jane Doe',
      dateText: '1d',
      bodyText: 'Edited\nThis is the actual comment.\nLike · Reply · 3d'
    });
    expect(parsed.text).toContain('This is the actual comment.');
    expect(parsed.text).not.toContain('Like · Reply');
  });
});

describe('parseAriaCommentLabel', () => {
  it('extracts author and relative date from standard English aria-label', () => {
    const result = parseAriaCommentLabel('Comment by Naigel Serrano Santos 36 minutes ago');
    expect(result.author).toBe('Naigel Serrano Santos');
    expect(result.date).toBe('36 minutes ago');
  });

  it('extracts author and short timestamp from English aria-label', () => {
    const result = parseAriaCommentLabel('Comment by Karl Venida 3 hours ago');
    expect(result.author).toBe('Karl Venida');
    expect(result.date).toBe('3 hours ago');
  });

  it('extracts author and date from Filipino/Tagalog aria-label', () => {
    const result = parseAriaCommentLabel('Komento ni Karl Venida 3 oras ang nakalipas');
    expect(result.author).toBe('Karl Venida');
    expect(result.date).toBe('3 oras ang nakalipas');
  });

  it('handles unrecognized or empty aria-label gracefully', () => {
    const result = parseAriaCommentLabel('');
    expect(result.author).toBe('');
    expect(result.date).toBe('');
  });
});
