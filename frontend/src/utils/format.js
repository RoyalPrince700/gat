export const formatMoney = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatNumber = (value) =>
  new Intl.NumberFormat('en-NG').format(value || 0);

export const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
};

const WEEK_ORDINALS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th'];

/**
 * Turn a week-start date (or "Week of YYYY-MM-DD") into
 * e.g. "2nd week in July 2026". Pass `{ short: true }` for chart ticks.
 */
/**
 * Relatable delay after an event: same day, 2 days after, 1 week after.
 */
export const formatDelayAfter = (days) => {
  if (days == null || Number.isNaN(Number(days))) return '—';
  const d = Math.max(0, Math.floor(Number(days)));
  if (d === 0) return 'same day';
  if (d === 1) return '1 day after';
  if (d < 7) return `${d} days after`;
  if (d === 7) return '1 week after';
  if (d < 14) return `${d} days after`;
  if (d === 14) return '2 weeks after';
  if (d < 21) return `${d} days after`;
  if (d === 21) return '3 weeks after';
  if (d < 30) return `${d} days after`;
  if (d < 45) return 'about a month after';
  if (d < 60) return 'over a month after';
  const months = Math.round(d / 30);
  if (d < 365) {
    return months <= 1 ? 'about a month after' : `${months} months after`;
  }
  const years = Math.round(d / 365);
  return years <= 1 ? 'about a year after' : `${years} years after`;
};

/** Relatable recency: today, yesterday, 2 days ago, 1 week ago */
export const formatDaysAgo = (days) => {
  if (days == null || Number.isNaN(Number(days))) return '—';
  const d = Math.max(0, Math.floor(Number(days)));
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d} days ago`;
  if (d === 7) return '1 week ago';
  if (d < 14) return `${d} days ago`;
  if (d === 14) return '2 weeks ago';
  if (d < 21) return `${d} days ago`;
  if (d === 21) return '3 weeks ago';
  if (d < 30) return `${d} days ago`;
  if (d < 45) return 'about a month ago';
  if (d < 60) return 'over a month ago';
  const months = Math.round(d / 30);
  if (d < 365) {
    return months <= 1 ? 'about a month ago' : `${months} months ago`;
  }
  const years = Math.round(d / 365);
  return years <= 1 ? 'about a year ago' : `${years} years ago`;
};

export const formatWeekLabel = (value, { short = false } = {}) => {
  if (value == null || value === '') return '';
  const raw = String(value);
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, monthIndex, day);
  if (Number.isNaN(date.getTime())) return raw;

  const weekOfMonth = Math.ceil(day / 7);
  const ordinal = WEEK_ORDINALS[weekOfMonth] || `${weekOfMonth}th`;
  if (short) {
    const monthShort = date.toLocaleString('en-US', { month: 'short' });
    return `${ordinal} ${monthShort}`;
  }
  const month = date.toLocaleString('en-US', { month: 'long' });
  return `${ordinal} week in ${month} ${year}`;
};

/** Value for <input type="datetime-local" /> in the user's local timezone */
export const toDateTimeLocal = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Parse datetime-local / date string into an ISO timestamp for the API */
export const toApiDateTime = (value) => {
  if (!value) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString();
};
