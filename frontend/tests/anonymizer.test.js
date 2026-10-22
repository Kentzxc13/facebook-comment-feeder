import { describe, it, expect } from 'vitest';
import { anonymizeComments } from '../src/utils/anonymizer.js';

describe('anonymizeComments', () => {
  const sample = [
    { id: '1', author: 'Alice Smith', date: '1 hr ago', text: 'First comment' },
    { id: '2', author: 'Bob Jones', date: '30m ago', text: 'Second comment' },
    { id: '3', author: 'Alice Smith', date: '10m ago', text: 'Third comment by Alice' },
    { id: '4', author: 'Charlie Brown', date: 'Just now', text: 'Fourth comment' }
  ];

  it('preserves real names and adds 1-based sequential row index when isAnonymized is false', () => {
    const result = anonymizeComments(sample, false);
    expect(result.length).toBe(4);
    expect(result[0].no).toBe(1);
    expect(result[0].author).toBe('Alice Smith');
    expect(result[1].no).toBe(2);
    expect(result[1].author).toBe('Bob Jones');
  });

  it('assigns consistent pseudonyms when isAnonymized is true', () => {
    const result = anonymizeComments(sample, true);
    expect(result[0].author).toBe('Commenter #1');
    expect(result[1].author).toBe('Commenter #2');
    // Alice Smith commented again in item 3: must receive Commenter #1
    expect(result[2].author).toBe('Commenter #1');
    expect(result[3].author).toBe('Commenter #3');
  });

  it('handles empty or null arrays without error', () => {
    expect(anonymizeComments([], true)).toEqual([]);
    expect(anonymizeComments(null, false)).toEqual([]);
  });
});
