const { ACCESSIBLE_SEASONS } = require('./accessibleMeta');

/**
 * Extract the school/client name from Excel column B and drop customer-care names.
 *
 * Column B often mixes school + care staff, e.g.:
 * 1. "SCHOOL NAME ; CARE NAME )" → text before ";"
 * 2. "SCHOOL NAME (CARE NAME)" → text before "("
 * 3. Extra spaces / trailing ")" — trim aggressively
 *
 * Examples:
 * - "THE ADEST NUR&PRY SCH ; RASAQ B2B )" → "THE ADEST NUR&PRY SCH"
 * - "CORNERSTONE N/P SCH (ADEDAYO/ODUSINA)" → "CORNERSTONE N/P SCH"
 * - "EDU BOOKSHOP ( AJALA B2B)" → "EDU BOOKSHOP"
 */
const cleanSchoolName = (raw) => {
  if (raw == null || raw === '') return '';
  let s = String(raw)
    .replace(/\u00a0/g, ' ')
    .trim();
  if (!s) return '';

  const semi = s.indexOf(';');
  if (semi !== -1) {
    s = s.slice(0, semi);
  } else {
    const paren = s.indexOf('(');
    if (paren !== -1) {
      s = s.slice(0, paren);
    }
  }

  return s
    .replace(/[)\]]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Parse a book-purchase amount. Accepts numbers or strings like "24,640" / "₦24,640".
 * Rejects non-numeric values. Zero is allowed.
 */
const parseAmount = (raw) => {
  if (raw == null || raw === '') {
    return { error: 'Amount is required' };
  }
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) {
      return { error: 'Amount must be a number ≥ 0' };
    }
    return { value: raw };
  }

  let s = String(raw)
    .replace(/\u00a0/g, ' ')
    .trim();
  s = s.replace(/₦/g, '').replace(/^NGN/i, '').replace(/,/g, '').replace(/\s+/g, '');
  if (!s) return { error: 'Amount is required' };
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    return { error: 'Amount must be a number ≥ 0' };
  }
  return { value: n };
};

const HEADER_SCHOOL = /^(s\/?n|s\.?n\.?|id|#|no|school|client|name|customer|description|particulars)$/i;
const HEADER_AMOUNT = /^(amount|paid|total|naira|sum|value|price|amt)$/i;

const looksLikeHeaderRow = (schoolRaw, amountRaw) => {
  const school = String(schoolRaw || '')
    .replace(/\s+/g, ' ')
    .trim();
  const amount = String(amountRaw == null ? '' : amountRaw)
    .replace(/\s+/g, ' ')
    .trim();
  if (HEADER_SCHOOL.test(school)) return true;
  if (HEADER_AMOUNT.test(amount) && Number.isNaN(Number(amount.replace(/,/g, '')))) {
    return true;
  }
  return false;
};

const isNumericLabel = (value) => {
  const s = String(value == null ? '' : value)
    .replace(/,/g, '')
    .trim();
  if (!s) return false;
  return /^\d+(\.\d+)?$/.test(s);
};

/**
 * Infer canonical season from a filename like "2023-2024 SEASON.xlsx".
 */
const inferSeasonFromFilename = (filename) => {
  const m = String(filename || '').match(/(20\d{2})\s*[-_/]\s*(20\d{2})/);
  if (!m) return '';
  const key = `${m[1]}-${m[2]}`;
  return ACCESSIBLE_SEASONS.includes(key) ? key : '';
};

const isCanonicalSeason = (value) => ACCESSIBLE_SEASONS.includes(String(value || ''));

/**
 * Spreadsheet summary rows that must never be treated as schools.
 * One imported 2024-2025 row was named TOTAL (₦1.24bn) and doubled KPIs.
 */
const JUNK_SCHOOL_KEYS = new Set([
  'total',
  'grandtotal',
  'subtotal',
  'sum',
  'balance',
  'bf',
  'cf',
]);

const junkKey = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[\s./\\_-]+/g, '');

const isJunkSchoolName = (value) => JUNK_SCHOOL_KEYS.has(junkKey(value));

module.exports = {
  cleanSchoolName,
  parseAmount,
  looksLikeHeaderRow,
  isNumericLabel,
  inferSeasonFromFilename,
  isCanonicalSeason,
  isJunkSchoolName,
};
