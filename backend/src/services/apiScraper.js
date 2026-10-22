import { fileURLToPath } from 'url';
import { normalizeFacebookDate } from '../utils/dateNormalizer.js';
import { isValidFacebookUrl } from '../utils/urlValidator.js';

const envPath = fileURLToPath(new URL('../../../.env', import.meta.url));

/**
 * Scrapes Facebook comments via Apify Facebook Comments Scraper Actor.
 * @param {string} url - Post URL
 * @param {{ token?: string, maxComments?: number }} options - API configuration
 * @param {(msg: string) => void} [onProgress] - Callback for real-time progress updates
 * @returns {Promise<Array<{ id: string, author: string, date: string, text: string }>>}
 */
export async function scrapeFacebookCommentsViaApi(url, options = {}, onProgress = () => {}) {
  try {
    process.loadEnvFile?.(envPath);
  } catch {
    try { process.loadEnvFile?.(); } catch {}
  }

  const token = (options.token && options.token.trim()) || process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error('Apify API token is required for Advanced Mode. Please provide an Apify API token or switch to Default mode.');
  }

  const validation = isValidFacebookUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid Facebook URL provided.');
  }

  const maxComments = options.maxComments || 150;
  onProgress('Initiating Apify Cloud Scraper Actor...');

  const runUrl = `https://api.apify.com/v2/acts/apify~facebook-comments-scraper/runs?token=${encodeURIComponent(token)}`;
  const runPayload = {
    startUrls: [{ url }],
    maxComments
  };

  const startRes = await fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(runPayload)
  });

  if (!startRes.ok) {
    const errText = await startRes.text().catch(() => '');
    throw new Error(`Apify Actor launch failed (${startRes.status}): ${errText || startRes.statusText}`);
  }

  const runData = await startRes.json();
  const runId = runData?.data?.id;
  const datasetId = runData?.data?.defaultDatasetId;

  if (!runId || !datasetId) {
    throw new Error('Invalid response received from Apify API.');
  }

  onProgress(`Cloud worker running (ID: ${runId.slice(0, 8)}...). Polling for results...`);

  // Poll until run completes (or timeout)
  let status = runData?.data?.status || 'RUNNING';
  const pollUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`;
  const maxAttempts = 30;
  let attempts = 0;

  while (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'ABORTED' && attempts < maxAttempts) {
    attempts++;
    await new Promise((r) => setTimeout(r, 3000));

    const pollRes = await fetch(pollUrl);
    if (pollRes.ok) {
      const pollData = await pollRes.json();
      status = pollData?.data?.status;
      onProgress(`Cloud worker status: ${status} (Pass ${attempts})...`);
    }
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify scraping run ended with status: ${status}`);
  }

  onProgress('Downloading structured comment dataset from cloud...');
  const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(token)}`;
  const datasetRes = await fetch(datasetUrl);

  if (!datasetRes.ok) {
    throw new Error(`Failed to retrieve dataset items (${datasetRes.status})`);
  }

  const items = await datasetRes.json();
  if (!Array.isArray(items)) {
    return [];
  }

  onProgress(`Formatting ${items.length} comments from cloud dataset...`);
  const results = [];
  let idx = 1;

  for (const item of items) {
    const author = item.profileName || item.author || item.user?.name || item.commenter || 'Unknown';
    const rawDate = item.date || item.timestamp || item.createdTime || item.time || '';
    const text = item.text || item.comment || item.message || '';

    if (!text && (!author || author === 'Unknown')) continue;

    results.push({
      id: `cmt-api-${idx++}`,
      author: String(author).trim(),
      date: normalizeFacebookDate(String(rawDate)),
      text: String(text).trim()
    });
  }

  onProgress(`Extraction complete! Received ${results.length} comments from cloud.`);
  return results;
}
