import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Auto-load .env file from workspace root (Node.js 20.6+)
export function reloadEnv() {
  try {
    process.loadEnvFile?.();
  } catch {
    try {
      process.loadEnvFile?.(path.resolve(process.cwd(), '.env'));
    } catch {}
  }
}
reloadEnv();

import { isValidFacebookUrl } from './utils/urlValidator.js';
import { createJob, getJob, updateJob } from './jobs.js';
import { scrapeFacebookComments } from './scraper.js';
import { scrapeFacebookCommentsViaApi, getApifyUsage } from './services/apiScraper.js';

export const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint for Render/hosting
app.get('/health', (req, res) => {
  reloadEnv();
  res.json({
    status: 'ok',
    hasApiToken: !!process.env.APIFY_API_TOKEN,
    timestamp: new Date().toISOString()
  });
});

// Apify account usage and limit endpoint
app.get('/api/apify/usage', async (req, res) => {
  reloadEnv();
  const customToken = req.query.token;
  const usage = await getApifyUsage(customToken);
  res.json(usage);
});

// Initiate scraping job
app.post('/api/scrape', async (req, res) => {
  reloadEnv();
  const { url, mode = 'default', apiKey } = req.body || {};

  const validation = isValidFacebookUrl(url);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const job = createJob(url.trim());

  // Run scraper asynchronously in background
  (async () => {
    try {
      updateJob(job.id, {
        status: 'scraping',
        progress: mode === 'advanced' ? 'Connecting to Apify Cloud Scraper...' : 'Starting local browser session...'
      });

      const onProgress = (progressMsg) => {
        updateJob(job.id, { progress: progressMsg });
      };

      let comments = [];
      if (mode === 'advanced') {
        comments = await scrapeFacebookCommentsViaApi(job.url, { token: apiKey }, onProgress);
      } else {
        comments = await scrapeFacebookComments(job.url, onProgress);
      }

      updateJob(job.id, {
        status: 'completed',
        progress: `Successfully extracted ${comments.length} comments.`,
        comments
      });
    } catch (err) {
      updateJob(job.id, {
        status: 'failed',
        progress: 'Failed to extract comments.',
        error: err.message || 'Scraping error occurred.'
      });
    }
  })();

  res.json({ jobId: job.id, status: job.status });
});

// Poll job progress and results
app.get('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const job = getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    url: job.url,
    status: job.status,
    progress: job.progress,
    comments: job.comments,
    error: job.error
  });
});

// Start server when run directly
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
const PORT = process.env.PORT || 5000;

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`🚀 Facebook Comment Feeder Backend running on http://localhost:${PORT}`);
  });
}
