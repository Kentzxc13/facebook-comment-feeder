import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/scraper.js', () => ({
  scrapeFacebookComments: vi.fn().mockResolvedValue([
    { id: 'cmt-1', author: 'Mark Z', date: 'Yesterday', text: 'Building the metaverse' }
  ])
}));

vi.mock('../src/services/apiScraper.js', () => ({
  scrapeFacebookCommentsViaApi: vi.fn().mockResolvedValue([
    { id: 'cmt-1', author: 'Mark Z', date: 'Yesterday', text: 'Building the metaverse' }
  ])
}));

import { app } from '../src/server.js';
import { anonymizeComments } from '../../frontend/src/utils/anonymizer.js';
import { generateWorkbookBuffer } from '../../frontend/src/utils/excelExporter.js';

describe('End-to-End Integration Pipeline', () => {
  it('handles job submission, status querying, anonymization, and excel generation', async () => {
    // 1. Submit valid URL
    const submitRes = await request(app)
      .post('/api/scrape')
      .send({ url: 'https://www.facebook.com/zuck/posts/10114382894589261' });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.jobId).toBeDefined();

    // 2. Poll job status
    const pollRes = await request(app).get(`/api/jobs/${submitRes.body.jobId}`);
    expect(pollRes.status).toBe(200);
    expect(pollRes.body.id).toBe(submitRes.body.jobId);
    expect(['pending', 'scraping', 'completed', 'failed']).toContain(pollRes.body.status);

    // 3. Verify mock/extracted comment stream through anonymization engine
    const mockComments = [
      { id: '1', author: 'Mark Z', date: 'Yesterday', text: 'Building the metaverse' },
      { id: '2', author: 'Sheryl S', date: '2 days ago', text: 'Lean in' },
      { id: '3', author: 'Mark Z', date: 'Today', text: 'Another comment by Mark' }
    ];

    const anonymized = anonymizeComments(mockComments, true);
    expect(anonymized.length).toBe(3);
    expect(anonymized[0].author).toBe('Commenter #1');
    expect(anonymized[1].author).toBe('Commenter #2');
    expect(anonymized[2].author).toBe('Commenter #1'); // Consistent pseudonym

    // 4. Verify Excel generation with anonymized data
    const buffer = await generateWorkbookBuffer(anonymized);
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(500);
  });
});
