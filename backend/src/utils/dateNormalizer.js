/**
 * Formats a JS Date object into MM/DD/YYYY hh:mm A
 * @param {Date} date
 * @returns {string}
 */
export function formatToMMDDYYYY(date) {
  if (!date || isNaN(date.getTime())) return 'Unknown';

  const pad = (n) => String(n).padStart(2, '0');
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedHours = pad(hours);

  return `${month}/${day}/${year} ${formattedHours}:${minutes} ${ampm}`;
}

/**
 * Parses raw Facebook relative or absolute timestamp strings into standardized MM/DD/YYYY hh:mm A format.
 * @param {string} rawDate - e.g. "3 hours ago", "45 minutes ago", "30m", "yesterday", "October 20 at 3:15 PM"
 * @param {Date} [referenceDate] - Baseline time (defaults to Date.now())
 * @returns {string}
 */
export function normalizeFacebookDate(rawDate, referenceDate = new Date()) {
  if (!rawDate || typeof rawDate !== 'string') {
    return 'Unknown';
  }

  const str = rawDate.trim();
  if (!str || str.toLowerCase() === 'unknown') {
    return 'Unknown';
  }

  const base = new Date(referenceDate.getTime());
  const lower = str.toLowerCase();

  // 1. "just now" / "ngayon lang"
  if (lower.includes('just now') || lower.includes('ngayon lang')) {
    return formatToMMDDYYYY(base);
  }

  // 2. Relative Minutes: "45 minutes ago", "45 mins", "45 min", "45m", "45 minuto ang nakalipas"
  const minMatch = str.match(/(\d+)\s*(?:m|min|mins|minutes|minuto(?:\s+ang\s+nakalipas)?)(?:\s+ago)?/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    const d = new Date(base.getTime() - mins * 60 * 1000);
    return formatToMMDDYYYY(d);
  }

  // 3. Relative Hours: "3 hours ago", "3 hrs", "3 hr", "3h", "3 oras ang nakalipas"
  const hourMatch = str.match(/(\d+)\s*(?:h|hr|hrs|hours|oras(?:\s+ang\s+nakalipas)?)(?:\s+ago)?/i);
  if (hourMatch) {
    const hrs = parseInt(hourMatch[1], 10);
    const d = new Date(base.getTime() - hrs * 3600 * 1000);
    return formatToMMDDYYYY(d);
  }

  // 4. Relative Seconds: "30s", "30 seconds ago", "30 segundo"
  const secMatch = str.match(/(\d+)\s*(?:s|sec|secs|seconds|segundo)(?:\s+ago)?/i);
  if (secMatch) {
    const secs = parseInt(secMatch[1], 10);
    const d = new Date(base.getTime() - secs * 1000);
    return formatToMMDDYYYY(d);
  }

  // 5. "yesterday" / "kahapon"
  if (lower.startsWith('yesterday') || lower.startsWith('kahapon')) {
    const d = new Date(base.getTime() - 24 * 3600 * 1000);
    // If there is an explicit time e.g. "Yesterday at 3:15 PM"
    const timeMatch = str.match(/at\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const mer = timeMatch[3]?.toUpperCase();
      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      d.setHours(h, m, 0, 0);
    }
    return formatToMMDDYYYY(d);
  }

  // 6. Relative Days: "2 days ago", "2d", "2 araw ang nakalipas"
  const dayMatch = str.match(/(\d+)\s*(?:d|days?|araw(?:\s+ang\s+nakalipas)?)(?:\s+ago)?/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    const d = new Date(base.getTime() - days * 24 * 3600 * 1000);
    return formatToMMDDYYYY(d);
  }

  // 7. Relative Weeks: "1 week ago", "1w"
  const weekMatch = str.match(/(\d+)\s*(?:w|weeks?|linggo)(?:\s+ago)?/i);
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10);
    const d = new Date(base.getTime() - weeks * 7 * 24 * 3600 * 1000);
    return formatToMMDDYYYY(d);
  }

  // 8. Explicit Month/Day strings e.g. "October 20 at 3:15 PM" or "October 20, 2024"
  const cleanedDateStr = str.replace(/\s+at\s+/i, ' ');
  const parsedTimestamp = Date.parse(cleanedDateStr);
  if (!isNaN(parsedTimestamp)) {
    const d = new Date(parsedTimestamp);
    // If year was omitted in the input string (e.g. "October 20 at 3:15 PM"), use reference year
    const hasExplicitYear = /\b(19\d\d|20\d\d)\b/.test(str);
    if (!hasExplicitYear) {
      d.setFullYear(base.getFullYear());
    }
    return formatToMMDDYYYY(d);
  }

  // Fallback: return the raw string as-is if unparseable
  return str;
}
