import path from 'path';
import { normalizeFacebookDate } from '../utils/dateNormalizer.js';
import { isValidFacebookUrl } from '../utils/urlValidator.js';

/**
 * Scrapes Facebook comments via Apify Facebook Comments Scraper Actor.
 * @param {string} url - Post URL
 * @param {{ token?: string, maxComments?: number }} options - API configuration
 * @param {(msg: string) => void} [onProgress] - Callback for real-time progress updates
 * @returns {Promise<Array<{ id: string, author: string, date: string, text: string }>>}
 */
export async function scrapeFacebookCommentsViaApi(url, options = {}, onProgress = () => {}) {
  try {
    process.loadEnvFile?.();
  } catch {
    try {
      process.loadEnvFile?.(path.resolve(process.cwd(), '.env'));
    } catch {}
  }

  const token = options.token !== undefined 
    ? options.token.trim() 
    : (process.env.APIFY_API_TOKEN || '').trim();
  if (!token) {
    throw new Error('Apify API token is required for Advanced Mode. Please provide an Apify API token or switch to Default mode.');
  }

  const validation = isValidFacebookUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid Facebook URL provided.');
  }

  const maxComments = options.maxComments || 250;
  onProgress('Initiating Apify Cloud Scraper Actor...');

  const runUrl = `https://api.apify.com/v2/acts/apify~facebook-comments-scraper/runs?token=${encodeURIComponent(token)}`;
  const runPayload = {
    startUrls: [{ url }],
    resultsLimit: maxComments,
    includeNestedComments: true,
    viewOption: 'RANKED_UNFILTERED'
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
    if (pollRes?.ok) {
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

  onProgress(`Formatting comments and nested replies from cloud dataset...`);
  const results = [];
  let idx = 1;

  const addComment = (item) => {
    const author = item.profileName || item.author?.name || item.author || item.user?.name || item.commenter || 'Unknown';
    const rawDate = item.date || item.timestamp || item.createdTime || item.time || '';
    const text = item.text || item.comment || item.message || '';

    if (!text && (!author || author === 'Unknown')) return;

    results.push({
      id: `cmt-api-${idx++}`,
      author: String(author).trim(),
      date: normalizeFacebookDate(String(rawDate)),
      text: String(text).trim()
    });
  };

  for (const item of items) {
    addComment(item);
    if (Array.isArray(item.comments)) {
      for (const nested of item.comments) {
        addComment(nested);
      }
    }
  }

  onProgress(`Extraction complete! Received ${results.length} comments from cloud.`);
  return results;
}

/**
 * Fetches monthly usage and limits from Apify Account API.
 * @param {string} [customToken] 
 * @returns {Promise<{ hasToken: boolean, usedUsd?: number, limitUsd?: number, remainingUsd?: number, percentageUsed?: number, resetDate?: string, error?: string }>}
 */
export async function getApifyUsage(customToken) {
  try {
    process.loadEnvFile?.();
  } catch {
    try {
      process.loadEnvFile?.(path.resolve(process.cwd(), '.env'));
    } catch {}
  }

  const token = (customToken && customToken.trim()) || process.env.APIFY_API_TOKEN;
  if (!token) {
    return {
      hasToken: false,
      error: 'No Apify API token configured in .env'
    };
  }

  try {
    const [usageRes, limitsRes] = await Promise.all([
      fetch(`https://api.apify.com/v2/users/me/usage/monthly?token=${encodeURIComponent(token)}`),
      fetch(`https://api.apify.com/v2/users/me/limits?token=${encodeURIComponent(token)}`)
    ]);

    if (!usageRes.ok || !limitsRes.ok) {
      return {
        hasToken: true,
        error: `Apify API returned HTTP ${usageRes.status}/${limitsRes.status}`
      };
    }

    const usageData = await usageRes.json();
    const limitsData = await limitsRes.json();

    const used = usageData?.data?.totalUsageCreditsUsdAfterVolumeDiscount || 0;
    const limit = limitsData?.data?.limits?.maxMonthlyUsageUsd || 5.00;
    const remaining = Math.max(0, limit - used);
    const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 1000) / 10) : 0;
    const cycleEnd = usageData?.data?.usageCycle?.endAt;

    let resetFormatted = null;
    if (cycleEnd) {
      try {
        const d = new Date(cycleEnd);
        resetFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {}
    }

    return {
      hasToken: true,
      usedUsd: Number(used.toFixed(2)),
      limitUsd: Number(limit.toFixed(2)),
      remainingUsd: Number(remaining.toFixed(2)),
      percentageUsed: percentage,
      resetDate: resetFormatted
    };
  } catch (err) {
    return {
      hasToken: true,
      error: err.message
    };
  }
}
