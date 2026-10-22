import { describe, it, expect } from 'vitest';
import { parseCommentNode } from '../src/scraper.js';

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
