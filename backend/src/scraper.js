import { chromium } from 'playwright';
import { isValidFacebookUrl } from './utils/urlValidator.js';

/**
 * Parses raw text chunks into clean comment fields.
 * Strips common Facebook UI artifacts like "Like · Reply · Share".
 * @param {{ authorText?: string, dateText?: string, bodyText?: string }} raw 
 * @returns {{ author: string, date: string, text: string }}
 */
export function parseCommentNode(raw) {
  const author = (raw?.authorText || '').trim() || 'Unknown';
  const date = (raw?.dateText || '').trim() || 'Unknown';

  let body = (raw?.bodyText || '').trim();

  // Strip leading "Edited" marker if on its own line
  body = body.replace(/^Edited\s*\n?/i, '');

  // Strip trailing Facebook interaction action buttons: "Like · Reply · Share", etc.
  body = body.replace(/\n?(?:Like|Reply|Share|React|See Translation|·|\d+[smhdwy])+(?:\s*·\s*(?:Like|Reply|Share|\d+[smhdwy]))*$/i, '');
  body = body.replace(/\n?Like\s*·\s*Reply.*$/i, '');

  return {
    author,
    date,
    text: body.trim()
  };
}

/**
 * Launches Playwright Chromium to scrape public comments from a Facebook post URL.
 * @param {string} url - Facebook post URL
 * @param {(progressMsg: string) => void} [onProgress] - Callback for real-time progress updates
 * @returns {Promise<Array<{ id: string, author: string, date: string, text: string }>>}
 */
export async function scrapeFacebookComments(url, onProgress = () => {}) {
  const validation = isValidFacebookUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid Facebook URL provided.');
  }

  onProgress('Launching automated browser...');

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-US'
    });

    const page = await context.newPage();

    onProgress('Connecting to Facebook post...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Give page a moment to render JS components
    await page.waitForTimeout(3000);

    // Dismiss cookie banners and login dialog overlays if present
    onProgress('Dismissing overlays and dialogs...');
    const dismissSelectors = [
      'div[aria-label="Close"]',
      'div[role="dialog"] [aria-label="Close"]',
      'button[data-cookiebanner="accept_button"]',
      'button[data-cookiebanner="accept_only_essential_button"]',
      'div[aria-label="Decline optional cookies"]',
      'text="Not Now"'
    ];

    for (const selector of dismissSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn && await btn.isVisible()) {
          await btn.click({ timeout: 1500 });
          await page.waitForTimeout(800);
        }
      } catch {
        // Non-blocking if overlay not present
      }
    }

    // Try to switch comment filter to "All comments" if dropdown is visible
    try {
      const filterButton = await page.$('text="Most relevant", text="Top comments"');
      if (filterButton && await filterButton.isVisible()) {
        await filterButton.click({ timeout: 2000 });
        await page.waitForTimeout(1000);
        const allCommentsOption = await page.$('text="All comments"');
        if (allCommentsOption) {
          await allCommentsOption.click({ timeout: 2000 });
          await page.waitForTimeout(2000);
        }
      }
    } catch {
      // Sorting dropdown not always available or required
    }

    // Expand comments iteratively
    onProgress('Expanding comments...');
    const maxScrollRounds = 12;
    for (let round = 1; round <= maxScrollRounds; round++) {
      let expandedAny = false;

      // Click "View more comments", "View previous comments", or "View X replies"
      const expandSelectors = [
        'div[role="button"]:has-text("View more comments")',
        'div[role="button"]:has-text("View previous comments")',
        'div[role="button"]:has-text("View all")',
        'span:has-text("View more comments")',
        'span:has-text("View previous comments")'
      ];

      for (const sel of expandSelectors) {
        try {
          const buttons = await page.$$(sel);
          for (const btn of buttons.slice(0, 3)) {
            if (await btn.isVisible()) {
              await btn.click({ timeout: 1000 });
              expandedAny = true;
              await page.waitForTimeout(1000);
            }
          }
        } catch {
          // ignore transient click errors
        }
      }

      // Scroll down gradually
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(1200);

      onProgress(`Scrolling and expanding comments (Round ${round}/${maxScrollRounds})...`);
    }

    onProgress('Extracting comment text and metadata...');

    // Extract comment elements from page DOM
    const rawComments = await page.evaluate(() => {
      const results = [];

      // Query comment containers (standard Facebook comment structures)
      const articles = document.querySelectorAll('div[role="article"]');
      if (articles.length > 0) {
        articles.forEach((el) => {
          // Find author link or strong element
          const authorEl = el.querySelector('a[role="link"] > span, span[dir="auto"] > strong, a[attributionsrc] > span');
          const authorText = authorEl ? authorEl.textContent.trim() : '';

          // Find timestamp
          const dateEl = el.querySelector('abbr, a[href*="comment_id"], a[href*="reply_comment_id"]');
          const dateText = dateEl ? (dateEl.getAttribute('aria-label') || dateEl.textContent.trim()) : '';

          // Find comment text body
          const bodyEl = el.querySelector('div[dir="auto"][style*="text-align"], div[dir="auto"]');
          const bodyText = bodyEl ? bodyEl.textContent.trim() : '';

          if (authorText || bodyText) {
            results.push({ authorText, dateText, bodyText });
          }
        });
      }

      // Fallback: If no role="article" found, query elements with dir="auto"
      if (results.length === 0) {
        const fallbackNodes = document.querySelectorAll('ul > li');
        fallbackNodes.forEach((el) => {
          const authorEl = el.querySelector('a, strong');
          const textEl = el.querySelector('span[dir="auto"]');
          if (authorEl && textEl) {
            results.push({
              authorText: authorEl.textContent.trim(),
              dateText: '',
              bodyText: textEl.textContent.trim()
            });
          }
        });
      }

      return results;
    });

    // Parse and deduplicate
    const uniqueMap = new Map();
    let idx = 1;

    for (const raw of rawComments) {
      const parsed = parseCommentNode(raw);
      if (!parsed.text && !parsed.author) continue;

      const dedupeKey = `${parsed.author}_${parsed.text.slice(0, 40)}`;
      if (!uniqueMap.has(dedupeKey)) {
        uniqueMap.set(dedupeKey, {
          id: `cmt-${idx++}`,
          author: parsed.author,
          date: parsed.date || 'Recent',
          text: parsed.text
        });
      }
    }

    const comments = Array.from(uniqueMap.values());
    onProgress(`Extraction complete! Found ${comments.length} comments.`);
    return comments;
  } catch (err) {
    onProgress(`Error during scraping: ${err.message}`);
    throw err;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
