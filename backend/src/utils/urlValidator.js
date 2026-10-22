/**
 * Validates whether a given string is a valid Facebook post URL.
 * @param {string} urlString 
 * @returns {{ valid: boolean, error?: string }}
 */
export function isValidFacebookUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string.' };
  }

  const trimmed = urlString.trim();

  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    const isFbHost = (
      hostname === 'facebook.com' ||
      hostname === 'www.facebook.com' ||
      hostname === 'm.facebook.com' ||
      hostname === 'web.facebook.com' ||
      hostname === 'fb.watch'
    );

    if (!isFbHost) {
      return { valid: false, error: 'URL hostname must be facebook.com or fb.watch.' };
    }

    if (parsed.pathname === '/' && !parsed.search) {
      return { valid: false, error: 'URL must point to a specific post or video.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }
}
