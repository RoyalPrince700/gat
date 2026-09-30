import { parseBulletItem } from './parseDepartmentReport.js';

const STOP = new Set([
  'rate',
  'compliance',
  'management',
  'and',
  'the',
  'of',
  'kpi',
  'staff',
  'key',
  'performance',
  'indicator',
  'unit',
  'a',
  'to',
  'for',
  'completed',
  'number',
  'with',
  'using',
  'from',
  'this',
  'month',
  'monthly',
  'weekly',
  'customer',
  'customers',
  'on',
  'in',
  'at',
  'by',
  'as',
  'an',
  'is',
  'are',
  'use',
  'used',
]);

export const cleanKpiName = (name) =>
  String(name || '')
    .replace(/\s*\(Target:\s*[^)]+\)\s*$/i, '')
    .replace(/\s*\((\d+(?:\.\d+)?)%?\)\s*$/i, '')
    .trim();

export const normalizeKpiName = (name) =>
  cleanKpiName(name)
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(' ');

const tokenHit = (x, y) =>
  x === y || (x.length >= 5 && (x === `${y}s` || y === `${x}s`));

export const namesOverlap = (a, b, { minHits = 2, longHit = 10 } = {}) => {
  const wa = normalizeKpiName(a).split(' ').filter(Boolean);
  const wb = normalizeKpiName(b).split(' ').filter(Boolean);
  if (!wa.length || !wb.length) return false;
  const sa = wa.join(' ');
  const sb = wb.join(' ');
  if (sa === sb) return true;
  const shorter = sa.length <= sb.length ? sa : sb;
  const longer = sa.length <= sb.length ? sb : sa;
  if (shorter.length >= 8 && longer.includes(shorter) && shorter.split(' ').length >= 2) {
    return true;
  }
  const hits = wa.filter(
    (x) => x.length >= 4 && wb.some((y) => y.length >= 4 && tokenHit(x, y))
  );
  if (hits.length >= minHits) return true;
  return hits.some((h) => h.length >= longHit);
};

const looksLikeMoney = (hint) =>
  /sales|revenue|amount|₦|naira|income|booking/i.test(hint || '');

const trimNum = (value) => String(value).replace(/\.0$/, '');

export const compactNumber = (n) => {
  const abs = Math.abs(Number(n));
  if (!Number.isFinite(abs)) return '—';
  if (abs >= 1000000) {
    return `${trimNum((n / 1000000).toFixed(abs >= 10000000 ? 0 : 1))}m`;
  }
  if (abs >= 1000) {
    return `${trimNum((n / 1000).toFixed(abs >= 10000 ? 0 : 1))}k`;
  }
  return Number(n).toLocaleString('en-NG');
};

export const formatFact = (value, unit, hint = '') => {
  if (value == null || Number.isNaN(Number(value))) return '';
  const n = Number(value);
  if (unit === '%') return `${Math.round(n)}%`;
  if (looksLikeMoney(hint)) return `₦${compactNumber(n)}`;
  return compactNumber(n);
};

const tenth = (pct) => {
  const n = Number(pct);
  if (!Number.isFinite(n)) return 0;
  if (n >= 99) return 10;
  return Math.min(9, Math.max(0, Math.round(n / 10)));
};

const aboutNinTen = (pct) => {
  const n = tenth(pct);
  if (n >= 10) return 'all of it';
  if (n <= 0) return 'almost none of it';
  if (n === 5) return 'about half';
  if (n === 1) return 'about 1 in 10';
  return `about ${n} in 10`;
};

const fractionChip = (pct) => {
  const n = tenth(pct);
  if (n >= 10) return 'All';
  if (n <= 0) return 'Almost none';
  if (n === 5) return 'Half';
  return `${n} in 10`;
};

const describeChange = (actual, previous) => {
  if (previous === 0) {
    return actual > 0 ? 'up from nothing last month' : 'unchanged';
  }
  const ratio = actual / previous;
  if (ratio >= 3) return 'up sharply';
  if (ratio >= 2) return 'more than doubled';
  if (ratio >= 1.4) return 'up by about half';
  if (ratio >= 1.08) return 'up from last month';
  if (ratio >= 0.92) return 'about the same as last month';
  if (ratio >= 0.5) return 'down from last month';
  return 'down sharply from last month';
};

export const healthFromMetric = ({
  actual,
  target,
  previous,
  statusText = '',
}) => {
  const s = String(statusText || '').toLowerCase();
  if (previous != null && actual != null && target == null) {
    const ratio = previous === 0 ? (actual > 0 ? 2 : 1) : actual / previous;
    if (ratio >= 1.08) return { tone: 'up', statusLabel: 'Up' };
    if (ratio <= 0.92) return { tone: 'down', statusLabel: 'Down' };
    return { tone: 'mid', statusLabel: 'Flat' };
  }
  if (actual != null && target != null) {
    const gap = Number(actual) - Number(target);
    if (gap >= 0) return { tone: 'up', statusLabel: 'On track' };
    if (gap > -15) return { tone: 'mid', statusLabel: 'Almost there' };
    return { tone: 'down', statusLabel: 'Needs attention' };
  }
  if (/achieved|strong|on track|met|completed|increase|growth/.test(s)) {
    return { tone: 'up', statusLabel: 'On track' };
  }
  if (/lagging|needs focus|below|delay|risk|drop|absent/.test(s)) {
    return { tone: 'down', statusLabel: 'Needs attention' };
  }
  if (/satisfactory|partial|minor|watch/.test(s)) {
    return { tone: 'mid', statusLabel: 'Watch' };
  }
  return { tone: 'neutral', statusLabel: 'This month' };
};

const countFromPoint = (point) => {
  if (point?.count != null && Number.isFinite(Number(point.count))) {
    return Number(point.count);
  }
  const m = String(point?.name || '').match(/\((\d+)\)/);
  return m ? Number(m[1]) : null;
};

const pieToRaw = (chart) => {
  const attended =
    chart.points.find((p) => /attend|yes|present|done/i.test(p.name)) ||
    chart.points[0];
  const rest = chart.points.filter((p) => p !== attended);
  const done = countFromPoint(attended);
  const other = rest.reduce((sum, p) => sum + (countFromPoint(p) || 0), 0);
  const total = done != null ? done + other : null;
  const actual =
    attended.value ??
    attended.actual ??
    (total ? Math.round((done / total) * 100) : null);
  const isAttendance = /attend/i.test(chart.title || '');
  return {
    name: cleanKpiName(chart.title),
    actual,
    target: isAttendance ? 100 : null,
    previous: null,
    unit: '%',
    hint: chart.title,
    source: chart.title,
    counts:
      done != null && total
        ? { done, total, label: /staff|people|employee|kss|attend/i.test(chart.title)
            ? 'staff'
            : 'people' }
        : null,
  };
};

const pointToRaw = (chart, point) => ({
  name: cleanKpiName(point.fullName || point.name),
  actual: point.actual ?? point.value,
  target: point.target ?? null,
  previous: point.previous ?? null,
  unit: chart.unit || '',
  hint: `${chart.title || ''} ${point.fullName || point.name || ''}`,
  source: chart.title || '',
  status: point.status || '',
  counts: null,
});

const collectRaw = (charts) => {
  const items = [];
  for (const chart of charts || []) {
    if (!chart?.points?.length) continue;
    if (chart.type === 'pie') {
      items.push(pieToRaw(chart));
      continue;
    }
    for (const point of chart.points) {
      items.push(pointToRaw(chart, point));
    }
  }
  return items.filter((item) => item.name && (item.actual != null || item.counts));
};

const mergeRaw = (items) => {
  const out = [];
  for (const item of items) {
    const existing = out.find((row) => namesOverlap(row.name, item.name));
    if (!existing) {
      out.push({ ...item });
      continue;
    }
    if (item.counts && !existing.counts) existing.counts = item.counts;
    if (item.previous != null && existing.previous == null) {
      existing.previous = item.previous;
    }
    if (item.target != null && existing.target == null) {
      existing.target = item.target;
    }
    if (item.actual != null && existing.actual == null) {
      existing.actual = item.actual;
    }
    if ((item.name || '').length > (existing.name || '').length * 1.4) {
      continue;
    }
    if (
      (item.name || '').length < (existing.name || '').length &&
      (item.name || '').length >= 8
    ) {
      existing.name = item.name;
    }
  }
  return out;
};

const findStory = (name, executive) => {
  const pool = [
    ...(executive?.achievements || []).map((text) => ({ text, kind: 'win' })),
    ...(executive?.challenges || []).map((text) => ({ text, kind: 'risk' })),
  ];
  for (const row of pool) {
    const parsed = parseBulletItem(row.text, 160);
    if (parsed.title && namesOverlap(name, parsed.title, { longHit: 6 })) {
      return { detail: parsed.summary || parsed.body, kind: row.kind };
    }
  }
  for (const row of pool) {
    const parsed = parseBulletItem(row.text, 160);
    if (namesOverlap(name, parsed.summary || parsed.body, { minHits: 2, longHit: 99 })) {
      return { detail: parsed.summary || parsed.body, kind: row.kind };
    }
  }
  return null;
};

const describeItem = (item) => {
  const { actual, target, previous, unit, counts, hint } = item;
  if (counts?.done != null && counts?.total) {
    const label = counts.label || 'people';
    const frac = aboutNinTen((counts.done / counts.total) * 100);
    return `${counts.done} of ${counts.total} ${label} this month — ${frac}.`;
  }
  if (unit === '%' && actual != null) {
    const pct = Math.round(actual);
    const gap = target != null ? pct - Number(target) : null;
    const frac = aboutNinTen(pct);
    if (gap != null && gap >= 0) {
      return pct >= 100
        ? 'The full target was met this month.'
        : `${frac} — target met.`;
    }
    if (gap != null && gap > -15) {
      return `${frac} of the way there. Only ${Math.abs(gap)} points short of target.`;
    }
    if (gap != null) {
      return `${frac} of the way there — ${Math.abs(gap)} points behind target.`;
    }
    return `${frac} this month.`;
  }
  if (previous != null && actual != null) {
    const fact = formatFact(actual, unit, hint);
    const prior = formatFact(previous, unit, hint);
    return `${fact} this month, ${describeChange(actual, previous)} (${prior} last month).`;
  }
  if (actual != null) {
    const fact = formatFact(actual, unit, hint);
    const label = cleanKpiName(item.name);
    if (label && label.length <= 28) {
      return `${fact} ${label.toLowerCase()} this month.`;
    }
    return `${fact} this month.`;
  }
  return '';
};

const factFor = (item) => {
  if (item.counts?.done != null && item.counts?.total) {
    return `${item.counts.done} of ${item.counts.total}`;
  }
  if (item.unit === '%' && item.actual != null) {
    return fractionChip(item.actual);
  }
  if (item.actual != null) {
    return formatFact(item.actual, item.unit, item.hint);
  }
  return '';
};

const TONE_RANK = { down: 0, mid: 1, neutral: 2, up: 3 };

const pickItems = (items) => {
  const ranked = [...items].sort((a, b) => {
    const tr = (TONE_RANK[a.tone] ?? 9) - (TONE_RANK[b.tone] ?? 9);
    if (tr !== 0) return tr;
    const gapA =
      a.target != null && a.actual != null ? a.actual - a.target : 0;
    const gapB =
      b.target != null && b.actual != null ? b.actual - b.target : 0;
    return gapA - gapB;
  });
  const take = (tone, limit) => ranked.filter((i) => i.tone === tone).slice(0, limit);
  const down = take('down', 4);
  const mid = take('mid', 3);
  const up = take('up', 2);
  const used = down.length + mid.length + up.length;
  const neutral = take('neutral', Math.max(2, 8 - used));
  return [...down, ...mid, ...neutral, ...up];
};

export const GROUP_LABELS = {
  down: 'Needs a look',
  mid: 'Almost there',
  neutral: 'This month',
  up: 'On track',
};

/**
 * Turn parsed charts + executive bullets into MD-friendly health cards.
 */
export const buildHealthSnapshot = (charts, executive) => {
  const merged = mergeRaw(collectRaw(charts));
  const described = merged.map((item) => {
    const health = healthFromMetric(item);
    const story = findStory(item.name, executive);
    let readout = describeItem(item);
    if (story?.detail) {
      const storyHasCount =
        item.counts && String(story.detail).includes(String(item.counts.done));
      if (item.counts && !storyHasCount) {
        readout = `${item.counts.done} of ${item.counts.total} ${item.counts.label}. ${story.detail}`;
      } else {
        readout = story.detail;
      }
    }
    const asSentence = (text) => {
      const t = String(text || '').trim();
      if (!t) return '';
      return t.charAt(0).toUpperCase() + t.slice(1);
    };
    readout = asSentence(readout);
    const barPct =
      item.unit === '%' && item.actual != null
        ? Math.max(0, Math.min(100, Number(item.actual)))
        : null;
    return {
      id: `${item.name}-${item.source}`,
      name: item.name,
      tone: health.tone || 'neutral',
      statusLabel: health.statusLabel,
      readout,
      fact: factFor(item),
      barPct,
      actual: item.actual,
      target: item.target,
    };
  });

  const items = pickItems(described);
  const groups = ['down', 'mid', 'neutral', 'up']
    .map((tone) => ({
      tone,
      title: GROUP_LABELS[tone],
      items: items.filter((i) => i.tone === tone),
    }))
    .filter((g) => g.items.length);

  return { items, groups };
};

export default buildHealthSnapshot;
