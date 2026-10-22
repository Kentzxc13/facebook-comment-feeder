import { chromium } from 'playwright';
import { isValidFacebookUrl } from './utils/urlValidator.js';

/**
 * Parses Facebook's container aria-label (e.g. "Comment by Jane Doe 2 hours ago")
 * into structured author and date fields.
 * Supports both English and multilingual (e.g. Filipino/Tagalog) patterns.
 * @param {string} ariaLabel 
 * @returns {{ author: string, date: string }}
 */
export function parseAriaCommentLabel(ariaLabel) {
  if (!ariaLabel || typeof ariaLabel !== 'string') {
    return { author: '', date: '' };
  }

  const clean = ariaLabel.trim();

  // English: "Comment by [Author] [Date / Relative Time]"
  const matchEn = clean.match(/Comment by\s+(.+?)\s+([0-9]+\s+[a-zA-Z]+(?:\s+ago)?|[0-9]+[smhdwy]|yesterday|just now|about\s+[0-9]+.+)$/i);
  if (matchEn) {
    return {
      author: matchEn[1].trim(),
      date: matchEn[2].trim()
    };
  }

  // Filipino / Tagalog: "Komento ni [Author] [Date / Relative Time]"
  const matchTl = clean.match(/Komento ni\s+(.+?)\s+([0-9]+\s+.+?ang nakalipas|[0-9]+[smhdwy]|kahapon|ngayon lang)$/i);
  if (matchTl) {
    return {
      author: matchTl[1].trim(),
      date: matchTl[2].trim()
    };
  }

  // Fallback: If starts with "Comment by", take the rest
  const prefixMatch = clean.match(/^(?:Comment by|Komento ni)\s+(.+)$/i);
  if (prefixMatch) {
    return {
      author: prefixMatch[1].trim(),
      date: ''
    };
  }

  return { author: '', date: '' };
}

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
      viewport: { width: 1280, height: 900 },
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const page = await context.newPage();

    onProgress('Connecting to Facebook post...');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await page.waitForTimeout(3500);

    // Dismiss cookie banners and login dialog overlays
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
          await page.waitForTimeout(600);
        }
      } catch {
        // Non-blocking
      }
    }

    // Expand comments iteratively by clicking "View more comments", replies, and scrolling
    onProgress('Expanding comments and threads...');
    const maxScrollRounds = 12;

    for (let round = 1; round <= maxScrollRounds; round++) {
      const clickedText = await page.evaluate(() => {
        const allSpans = Array.from(document.querySelectorAll('span, div[role="button"]'));
        const target = allSpans.find(s => {
          const t = s.textContent.trim().toLowerCase();
          return t.includes('view more comments') ||
                 t.includes('view previous comments') ||
                 t.includes('tingnan ang higit pang') ||
                 t.includes('view all') ||
                 t.includes('replies') ||
                 t.includes('reply');
        });

        if (target) {
          let clickable = target;
          while (clickable && clickable !== document.body && clickable.tagName !== 'BUTTON' && clickable.getAttribute('role') !== 'button') {
            if (clickable.parentElement?.getAttribute('role') === 'button' || clickable.parentElement?.tagName === 'BUTTON') {
              clickable = clickable.parentElement;
              break;
            }
            clickable = clickable.parentElement;
          }
          (clickable || target).click();
          return target.textContent.trim();
        }
        return null;
      });

      if (clickedText) {
        onProgress(`Expanding comments: Clicked "${clickedText.slice(0, 30)}" (Round ${round}/${maxScrollRounds})...`);
        await page.waitForTimeout(2000);
      } else {
        // Gradual scroll to trigger dynamic lazy loading
        await page.evaluate(() => window.scrollBy(0, 900));
        await page.waitForTimeout(1500);
      }
    }

    onProgress('Extracting comment text and metadata...');

    // Extract comment elements from page DOM
    const rawComments = await page.evaluate(() => {
      const results = [];

      // Find all articles that represent individual comments
      // (Exclude main post container by checking that aria-label contains comment/komento)
      const allArticles = Array.from(document.querySelectorAll('div[role="article"]'));
      const commentArticles = allArticles.filter(a => {
        const aria = (a.getAttribute('aria-label') || '').toLowerCase();
        return aria.includes('comment by') || aria.includes('komento ni') || aria.includes('comment') || aria.includes('komento');
      });

      if (commentArticles.length > 0) {
        commentArticles.forEach((a) => {
          const rawAria = a.getAttribute('aria-label') || '';

          // 1. Author and Date extraction (aria-label priority)
          let author = '';
          let date = '';

          const mEn = rawAria.match(/Comment by\s+(.+?)\s+([0-9]+\s+[a-zA-Z]+(?:\s+ago)?|[0-9]+[smhdwy]|yesterday|just now|about\s+[0-9]+.+)$/i);
          if (mEn) {
            author = mEn[1].trim();
            date = mEn[2].trim();
          } else {
            const mTl = rawAria.match(/Komento ni\s+(.+?)\s+([0-9]+\s+.+?ang nakalipas|[0-9]+[smhdwy]|kahapon|ngayon lang)$/i);
            if (mTl) {
              author = mTl[1].trim();
              date = mTl[2].trim();
            } else {
              const mPref = rawAria.match(/^(?:Comment by|Komento ni)\s+(.+)$/i);
              if (mPref) {
                author = mPref[1].trim();
              }
            }
          }

          // Fallback DOM Author
          if (!author) {
            const authorEl = a.querySelector('a[role="link"] > span, span[dir="auto"] > strong, a[href*="facebook.com/"] > span, h3, h4');
            if (authorEl && authorEl.textContent.trim()) {
              author = authorEl.textContent.trim();
            }
          }

          // Fallback DOM Timestamp
          if (!date) {
            const dateEl = a.querySelector('abbr, a[href*="comment_id"], a[role="link"]');
            if (dateEl) {
              const dateAttr = dateEl.getAttribute('aria-label');
              const dateText = dateEl.textContent.trim();
              date = dateAttr || dateText;
            }
          }

          // 3. Comment text extraction
          const dirNodes = Array.from(a.querySelectorAll('div[dir="auto"], span[dir="auto"]'));
          const textCandidates = dirNodes
            .map(n => n.textContent.trim())
            .filter(t => {
              if (!t) return false;
              if (author && t.toLowerCase() === author.toLowerCase()) return false;
              if (t.includes('· Reply') || t.includes('· Like') || t.startsWith('Edited\n')) return false;
              return true;
            });

          let bodyText = textCandidates.length > 0 ? textCandidates[0] : '';
          if (author && bodyText.toLowerCase().startsWith(author.toLowerCase())) {
            const remainder = bodyText.slice(author.length).trim();
            if (remainder) {
              bodyText = remainder;
            }
          }

          if (author || bodyText || rawAria) {
            results.push({
              rawAria,
              authorText: author,
              dateText: date,
              bodyText
            });
          }
        });
      }

      // Fallback: If no comment articles matched, look for list items
      if (results.length === 0) {
        const listItems = document.querySelectorAll('ul > li');
        listItems.forEach((el) => {
          const authorEl = el.querySelector('a, strong');
          const textEl = el.querySelector('span[dir="auto"]');
          const dateEl = el.querySelector('abbr, a[href*="comment_id"]');
          if (authorEl && textEl) {
            results.push({
              rawAria: '',
              authorText: authorEl.textContent.trim(),
              dateText: dateEl ? dateEl.textContent.trim() : '',
              bodyText: textEl.textContent.trim()
            });
          }
        });
      }

      return results;
    });

    // Parse, merge aria-label metadata, and deduplicate
    const uniqueMap = new Map();
    let idx = 1;

    for (const raw of rawComments) {
      let { author, date, text } = parseCommentNode(raw);

      // If author or date is missing, parse from container aria-label
      if ((!author || author === 'Unknown' || !date || date === 'Unknown') && raw.rawAria) {
        const ariaParsed = parseAriaCommentLabel(raw.rawAria);
        if ((!author || author === 'Unknown') && ariaParsed.author) {
          author = ariaParsed.author;
        }
        if ((!date || date === 'Unknown') && ariaParsed.date) {
          date = ariaParsed.date;
        }
      }

      // If text is still empty, skip
      if (!text && (!author || author === 'Unknown')) continue;

      const dedupeKey = `${author}_${text.slice(0, 40)}`;
      if (!uniqueMap.has(dedupeKey)) {
        uniqueMap.set(dedupeKey, {
          id: `cmt-${idx++}`,
          author: author || 'Unknown',
          date: date || 'Recent',
          text
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
