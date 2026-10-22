import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeFacebookCommentsViaApi } from '../src/services/apiScraper.js';

describe('scrapeFacebookCommentsViaApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an error if no API token is provided', async () => {
    await expect(scrapeFacebookCommentsViaApi('https://www.facebook.com/posts/123', { token: '' }))
      .rejects.toThrow(/Apify API token is required/i);
  });

  it('successfully executes actor run and parses dataset items', async () => {
    const mockRunResponse = {
      data: {
        id: 'run-123',
        status: 'READY',
        defaultDatasetId: 'dataset-123'
      }
    };

    const mockPollResponse = {
      data: {
        id: 'run-123',
        status: 'SUCCEEDED',
        defaultDatasetId: 'dataset-123'
      }
    };

    const mockItems = [
      {
        profileName: 'Alice Smith',
        date: '3 hours ago',
        text: 'Great post!'
      },
      {
        user: { name: 'Bob Jones' },
        timestamp: '2026-10-22T10:00:00Z',
        message: 'Second comment'
      }
    ];

    const fetchMock = vi.fn()
      // 1. Initial Actor Run
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRunResponse
      })
      // 2. Poll Status
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPollResponse
      })
      // 3. Dataset items
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockItems
      });

    globalThis.fetch = fetchMock;

    const progressUpdates = [];
    const results = await scrapeFacebookCommentsViaApi(
      'https://www.facebook.com/posts/123',
      { token: 'valid-apify-token' },
      (msg) => progressUpdates.push(msg)
    );

    expect(results.length).toBe(2);
    expect(results[0].author).toBe('Alice Smith');
    expect(results[0].text).toBe('Great post!');
    expect(results[0].date).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(results[1].author).toBe('Bob Jones');
    expect(results[1].text).toBe('Second comment');
    expect(progressUpdates.length).toBeGreaterThan(0);
  });
});
