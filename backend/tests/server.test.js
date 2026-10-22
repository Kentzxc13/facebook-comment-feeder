import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../src/scraper.js', () => ({
  scrapeFacebookComments: vi.fn().mockResolvedValue([])
}));

vi.mock('../src/services/apiScraper.js', () => ({
  scrapeFacebookCommentsViaApi: vi.fn().mockResolvedValue([])
}));

import { app } from '../src/server.js';

describe('Backend API Endpoints', () => {
  it('GET /health returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/scrape rejects missing or invalid url with 400', async () => {
    const res = await request(app).post('/api/scrape').send({ url: 'not-facebook' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/scrape accepts valid url and returns jobId', async () => {
    const res = await request(app).post('/api/scrape').send({ url: 'https://www.facebook.com/user/posts/123456' });
    expect(res.status).toBe(200);
    expect(res.body.jobId).toBeDefined();

    // Verify job can be queried
    const jobRes = await request(app).get(`/api/jobs/${res.body.jobId}`);
    expect(jobRes.status).toBe(200);
    expect(jobRes.body.id).toBe(res.body.jobId);
    expect(jobRes.body.status).toBeDefined();
  });

  it('POST /api/scrape accepts advanced mode with apiKey', async () => {
    const res = await request(app).post('/api/scrape').send({
      url: 'https://www.facebook.com/user/posts/123456',
      mode: 'advanced',
      apiKey: 'test-token'
    });
    expect(res.status).toBe(200);
    expect(res.body.jobId).toBeDefined();
  });

  it('GET /api/jobs/:id returns 404 for unknown job ID', async () => {
    const res = await request(app).get('/api/jobs/unknown-id');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Job not found');
  });
});
