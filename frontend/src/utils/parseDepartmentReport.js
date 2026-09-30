/**
 * Parse department-report markdown into narrative + chartable metrics.
 */

const cleanCell = (value) =>
  String(value || '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[cite:\s*\d+\]/gi, '')
    .trim();

const cleanHeading = (value) =>
  cleanCell(value)
    .replace(/^Slide\s+\d+:\s*/i, '')
    .trim();

const parsePercent = (value) => {
  const text = cleanCell(value);
  if (!text || text === '—' || text === '-') return null;
  const m = text.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
};

const parseScaledNumber = (raw, suffix) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const s = String(suffix || '').toUpperCase();
  if (s === 'K') return n * 1000;
  if (s === 'M') return n * 1000000;
  if (s === 'B') return n * 1000000000;
  return n;
};

const parseNumber = (value) => {
  const text = cleanCell(value).replace(/,/g, '');
  if (!text || text === '—' || text === '-') return null;
  const pct = parsePercent(value);
  if (pct != null) return pct;
  const scaled = text.match(/^(-?\d+(?:\.\d+)?)\s*([KMB])\b/i);
  if (scaled) return parseScaledNumber(scaled[1], scaled[2]);
  const money = text.match(/(?:₦|NGN|N)?\s*(-?\d+(?:\.\d+)?)/i);
  if (money) {
    const n = Number(money[1]);
    return Number.isFinite(n) ? n : null;
  }
  const leading = text.match(/^(-?\d+(?:\.\d+)?)/);
  if (leading) {
    const n = Number(leading[1]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const isSeparatorRow = (cells) =>
  cells.every((c) => {
    const t = cleanCell(c).replace(/\s/g, '');
    return !t || /^:?-{3,}:?$/.test(t);
  });

const parseTable = (lines) => {
  const rows = lines
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cleanCell)
    )
    .filter((cells) => cells.some(Boolean));

  if (rows.length < 2) return null;
  const header = rows[0];
  const body = rows.slice(1).filter((r) => !isSeparatorRow(r));
  if (!body.length) return null;
  return { header, rows: body };
};

const findCol = (header, predicates) => {
  const lower = header.map((h) => h.toLowerCase());
  for (const pred of predicates) {
    const idx = lower.findIndex(pred);
    if (idx >= 0) return idx;
  }
  return -1;
};

const shortName = (name) =>
  name.length > 40 ? `${name.slice(0, 38)}…` : name;

const tableToChart = (table, title) => {
  if (!table) return null;
  const { header, rows } = table;

  const labelIdx = findCol(header, [
    (h) => h.includes('kpi'),
    (h) => h.includes('indicator'),
    (h) => h.includes('priority'),
    (h) => h.includes('objective'),
  ]);
  const targetIdx = findCol(header, [(h) => h.includes('target')]);
  const actualIdx = findCol(header, [
    (h) => /actual\s*\(august/i.test(h),
    (h) => h.includes('actual') && !h.includes('july'),
    (h) => h.includes('actual'),
  ]);
  const previousIdx = findCol(header, [
    (h) => /actual\s*\(july/i.test(h),
    (h) => h.includes('july'),
  ]);

  const looksLikeRecs =
    header.length <= 2 &&
    header.some((h) => /recommend/i.test(h) || /^s\/n$/i.test(h));
  if (looksLikeRecs) return null;

  const nameIdx = labelIdx >= 0 ? labelIdx : 0;
  const points = [];

  for (const row of rows) {
    const name = cleanCell(row[nameIdx]);
    if (!name || /^s\/n$/i.test(name)) continue;

    const target = targetIdx >= 0 ? parseNumber(row[targetIdx]) : null;
    let actual = actualIdx >= 0 ? parseNumber(row[actualIdx]) : null;
    const previous = previousIdx >= 0 ? parseNumber(row[previousIdx]) : null;
    if (actual == null && previous != null && actualIdx === previousIdx) {
      actual = previous;
    }

    if (target == null && actual == null && previous == null) continue;

    points.push({
      name: shortName(name),
      fullName: name,
      target,
      actual: actual ?? previous,
      previous: actual != null && previous != null ? previous : null,
    });
  }

  if (points.length < 2) return null;

  const hasTargetActual = points.some((p) => p.target != null && p.actual != null);
  const hasCompare = points.some((p) => p.previous != null && p.actual != null);
  const numericActuals = points
    .map((p) => p.actual)
    .filter((v) => v != null && Number.isFinite(v));
  const allPercentish =
    numericActuals.length > 0 &&
    points.every((p) =>
      [p.target, p.actual, p.previous]
        .filter((v) => v != null)
        .every((v) => Math.abs(v) <= 200)
    );

  const base = {
    type: hasCompare ? 'compare' : hasTargetActual ? 'targetActual' : 'actual',
    title: title || 'Performance',
    unit: allPercentish ? '%' : '',
  };

  // Split wildly different scales (e.g. call counts vs ₦ sales)
  if (!allPercentish && numericActuals.length >= 3) {
    const max = Math.max(...numericActuals);
    const small = points.filter(
      (p) => p.actual != null && p.actual <= max / 50
    );
    const large = points.filter(
      (p) => p.actual != null && p.actual > max / 50
    );
    if (small.length >= 2 && large.length >= 2) {
      return [
        { ...base, title: `${base.title} — activity`, points: small },
        { ...base, title: `${base.title} — volume`, points: large },
      ];
    }
    if (small.length >= 2 && large.length === 1) {
      return [
        {
          type: 'stat',
          title: large[0].fullName || large[0].name,
          unit: '',
          points: large,
        },
        { ...base, title: `${base.title}`, points: small },
      ];
    }
  }

  return { ...base, points };
};

const extractScorecard = (text) => {
  const points = [];
  // Require a colon so "**89%** of appraisals..." narrative does not match
  const re =
    /^\s*[-*]\s*\*\*(-?\d+(?:\.\d+)?)%:\*\*\s*(.+)$|^\s*[-*]\s*\*\*(-?\d+(?:\.\d+)?)%\*\*:\s*(.+)$/gm;
  let m;
  while ((m = re.exec(text))) {
    const actual = Number(m[1] || m[3]);
    const label = cleanCell(m[2] || m[4]);
    if (!label) continue;
    points.push({
      name: shortName(label),
      fullName: label,
      actual,
      target: 100,
    });
  }
  if (points.length < 2) return null;
  return {
    chart: {
      type: 'targetActual',
      title: 'Key performance scorecard',
      unit: '%',
      points,
    },
    stripRe:
      /^\s*[-*]\s*\*\*-?\d+(?:\.\d+)?%:\*\*\s*.+$|^\s*[-*]\s*\*\*-?\d+(?:\.\d+)?%\*\*:\s*.+$/gm,
  };
};

const extractOpsBullets = (text, title) => {
  const points = [];
  const re =
    /^\s*[-*]\s*\*\*(.+?):\*\*\s*(-?\d+(?:\.\d+)?)\s*%(?:\s*\*?\(?\s*Target:\s*(-?\d+(?:\.\d+)?)\s*%\s*\)?\*?)?/gim;
  let m;
  while ((m = re.exec(text))) {
    // Skip scorecard-style "**91%:** Label" lines
    if (/^-?\d+(?:\.\d+)?%$/.test(cleanCell(m[1]))) continue;
    points.push({
      name: shortName(cleanCell(m[1])),
      fullName: cleanCell(m[1]),
      actual: Number(m[2]),
      target: m[3] != null ? Number(m[3]) : 100,
    });
  }
  if (points.length < 2) return null;
  return {
    chart: {
      type: 'targetActual',
      title: title || 'Operational KPI performance',
      unit: '%',
      points,
    },
    stripRe:
      /^\s*[-*]\s*\*\*(?!\d+%).+?:\*\*\s*-?\d+(?:\.\d+)?\s*%(?:\s*\*?\(?\s*Target:\s*-?\d+(?:\.\d+)?\s*%\s*\)?\*?)?.*$/gim,
  };
};

const extractAttendancePie = (text) => {
  const attended = text.match(/\*\*Attended:\*\*\s*(\d+)\s*Staff\s*\((\d+)%\)/i);
  const absent = text.match(
    /\*\*Absent\s*\/\s*Non-Participant:\*\*\s*(\d+)\s*Staff\s*\((\d+)%\)/i
  );
  if (!attended || !absent) return null;
  return {
    chart: {
      type: 'pie',
      title: 'KSS attendance',
      points: [
        {
          name: `Attended (${attended[1]})`,
          value: Number(attended[2]),
          count: Number(attended[1]),
        },
        {
          name: `Absent (${absent[1]})`,
          value: Number(absent[2]),
          count: Number(absent[1]),
        },
      ],
    },
  };
};

const normalizeHeadingLine = (line) =>
  line.replace(/^(#{1,3})\s+Slide\s+\d+:\s*/i, '$1 ');

const stripNoise = (text) =>
  String(text || '')
    .replace(/\[cite:\s*\d+\]/gi, '')
    .replace(/\*\(Note:.*?\)\*/gi, '')
    .replace(/\(Note:.*?\)/gi, '')
    .replace(/^\*\*Website:\*\*.*$/gim, '')
    .replace(/^\*\*Value Chain:\*\*.*$/gim, '')
    .replace(/^\*\*Thank You!?\*\*.*$/gim, '')
    .replace(/^\*Inform\.\s*Inspire.*\*$/gim, '')
    .replace(/^\*Empowering People.*\*$/gim, '')
    .replace(/^\*Performance\s*[—\-–>].*$/gim, '')
    .replace(/^---\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const cleanBullet = (line) =>
  cleanCell(
    line
      .replace(/^\s*[-*]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/^\*\*Major Achievements:\*\*\s*/i, '')
  );

const extractActionBullets = (text) => {
  const items = [];
  const skipBlocks = new Set(['what is working', 'what is not working']);
  let skipping = false;

  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    const block = trimmed.match(/^\*\*(.+?):\*\*\s*$/);
    if (block) {
      skipping = skipBlocks.has(block[1].toLowerCase());
      continue;
    }
    if (skipping) continue;
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const item = cleanBullet(line);
      if (item && item.length > 2) items.push(item);
    }
  }
  return items;
};

const extractBullets = (text) => extractActionBullets(text);

const extractParagraph = (text) => {
  const chunks = stripNoise(text)
    .split(/\n{2,}/)
    .map((p) =>
      p
        .replace(/^#{1,6}\s+.+$/gm, '')
        .replace(/^\s*[-*]\s+/gm, '')
        .replace(/\*\*/g, '')
        .replace(/\n+/g, ' ')
        .trim()
    )
    .filter((p) => p.length > 20 && !/^website:/i.test(p));
  return chunks[0] || '';
};

const truncate = (text, max = 280) => {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trim()}…`;
};

/** Split "Title: detail" bullets into scannable card fields. */
export const parseBulletItem = (text, summaryMax = 110) => {
  const cleaned = cleanCell(text);
  const split = cleaned.match(/^(.+?):\s*(.+)$/s);
  if (split) {
    const title = split[1].trim();
    const body = split[2].trim();
    return {
      title,
      body,
      summary: truncate(body, summaryMax),
      metric: body.match(/\b(\d+(?:\.\d+)?%|\d+(?:,\d{3})*(?:\.\d+)?)\b/)?.[1] || null,
    };
  }
  return {
    title: '',
    body: cleaned,
    summary: truncate(cleaned, summaryMax),
    metric: cleaned.match(/\b(\d+(?:\.\d+)?%|\d+(?:,\d{3})*(?:\.\d+)?)\b/)?.[1] || null,
  };
};

export const summarizeForExec = (text, max = 110) => truncate(cleanCell(text), max);

const isSkipSection = (title) =>
  /^(slide\s*\d+:\s*)?(title|closing)/i.test(cleanHeading(title)) ||
  /^thank you/i.test(cleanHeading(title));

const classifySection = (title) => {
  const t = cleanHeading(title).toLowerCase();
  if (/executive\s+summary/.test(t)) return 'summary';
  if (/key\s+achievements|highlights/.test(t)) return 'achievements';
  if (/operational\s+(kpi\s+)?performance|performance\s+matrix|key\s+operational/.test(t))
    return 'operational';
  if (/strategic\s+performance/.test(t)) return 'strategic';
  if (/challenges|bottlenecks|risks/.test(t)) return 'challenges';
  if (/strategic\s+priority|next\s+month|next\s+meeting/.test(t)) return 'priorities';
  if (/recommendations?|actionable\s+recommendations?/.test(t)) return 'recommendations';
  return 'other';
};

const isEmptyCell = (value) => {
  const t = cleanCell(value);
  return !t || t === '—' || t === '-' || /^\*?\(unspecified\)\*?$/i.test(t);
};

const tableToStatusRows = (table) => {
  if (!table) return [];
  const { header, rows } = table;
  const kpiIdx = findCol(header, [
    (h) => h.includes('kpi'),
    (h) => h.includes('indicator'),
    (h) => h.includes('objective'),
    (h) => h.includes('priority'),
  ]);
  const targetIdx = findCol(header, [(h) => h.includes('target')]);
  const actualIdx = findCol(header, [(h) => h.includes('actual')]);
  const statusIdx = findCol(header, [
    (h) => h.includes('status'),
    (h) => h.includes('variance'),
  ]);
  const nameIdx = kpiIdx >= 0 ? kpiIdx : 0;

  return rows
    .map((row) => ({
      kpi: cleanCell(row[nameIdx]),
      target: targetIdx >= 0 ? cleanCell(row[targetIdx]) : '',
      actual: actualIdx >= 0 ? cleanCell(row[actualIdx]) : '',
      status: statusIdx >= 0 ? cleanCell(row[statusIdx]) : '',
    }))
    .filter(
      (r) =>
        r.kpi &&
        !/^s\/n$/i.test(r.kpi) &&
        (!isEmptyCell(r.actual) || !isEmptyCell(r.status))
    );
};

const tableToPriorities = (table) => {
  if (!table) return [];
  const { header, rows } = table;
  const priorityIdx = findCol(header, [
    (h) => h.includes('priority'),
    (h) => h.includes('objective'),
  ]);
  const targetIdx = findCol(header, [(h) => h.includes('target')]);
  const actualIdx = findCol(header, [(h) => h.includes('actual')]);
  const gapIdx = findCol(header, [(h) => h.includes('gap')]);
  const commitIdx = findCol(header, [(h) => h.includes('commitment')]);
  const nameIdx = priorityIdx >= 0 ? priorityIdx : 0;

  return rows
    .map((row) => ({
      priority: cleanCell(row[nameIdx]),
      target: targetIdx >= 0 ? cleanCell(row[targetIdx]) : '',
      actual: actualIdx >= 0 ? cleanCell(row[actualIdx]) : '',
      gap: gapIdx >= 0 ? cleanCell(row[gapIdx]) : '',
      commitment: commitIdx >= 0 ? cleanCell(row[commitIdx]) : '',
    }))
    .filter(
      (r) =>
        r.priority &&
        !/^s\/n$/i.test(r.priority) &&
        [r.target, r.actual, r.gap, r.commitment].some((v) => !isEmptyCell(v))
    );
};

const tableToRecommendations = (table) => {
  if (!table) return [];
  const { header, rows } = table;
  const recIdx = findCol(header, [
    (h) => /recommend/i.test(h),
    (h) => /key/i.test(h),
  ]);
  const textIdx = recIdx >= 0 ? recIdx : header.length - 1;

  return rows
    .map((row) => cleanCell(row[textIdx]))
    .filter((t) => t && !/^\*?\(unspecified\)\*?$/i.test(t) && t !== '—');
};

const extractMustChange = (text) => {
  const items = [];
  const block = text.match(
    /(?:what must change|must change\s*\/?\s*innovate)[:\s]*([\s\S]*?)(?=\n##|\n---|$)/i
  );
  if (!block) return items;
  return extractBullets(block[1]).slice(0, 5);
};

const splitSections = (markdown) => {
  const sections = [];
  let current = { title: '', level: 0, body: '' };
  const lines = stripNoise(markdown).split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match && match[1].length <= 2) {
      if (current.title || current.body.trim()) sections.push({ ...current });
      current = {
        title: cleanHeading(match[2]),
        level: match[1].length,
        body: '',
      };
      continue;
    }
    current.body += `${line}\n`;
  }
  if (current.title || current.body.trim()) sections.push({ ...current });
  return sections;
};

const uniqueItems = (items, limit = 6) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
};

const buildExecutive = (sections, chartedTableTitles) => {
  const executive = {
    summary: '',
    achievements: [],
    challenges: [],
    recommendations: [],
    priorities: [],
    statusRows: [],
  };

  for (const section of sections) {
    if (isSkipSection(section.title)) continue;
    const kind = classifySection(section.title);
    const body = stripNoise(section.body);

    if (kind === 'summary') {
      const para = extractParagraph(body);
      const highlights = extractBullets(
        body.match(/###\s*highlights[\s\S]*/i)?.[0] || body
      );
      executive.summary = truncate(para || highlights.join(' '));
      if (highlights.length) {
        executive.achievements.push(...highlights);
      }
      continue;
    }

    if (kind === 'achievements') {
      executive.achievements.push(...extractBullets(body));
      continue;
    }

    if (kind === 'challenges') {
      executive.challenges.push(...extractBullets(body));
      continue;
    }

    if (kind === 'recommendations') {
      executive.recommendations.push(...extractMustChange(body));
      const tableLines = body
        .split(/\r?\n/)
        .filter((l) => l.trim().startsWith('|'));
      if (tableLines.length >= 2) {
        executive.recommendations.push(
          ...tableToRecommendations(parseTable(tableLines))
        );
      }
      executive.recommendations.push(...extractActionBullets(body));
      continue;
    }

    if (kind === 'priorities') {
      const tableLines = body
        .split(/\r?\n/)
        .filter((l) => l.trim().startsWith('|'));
      if (tableLines.length >= 2) {
        executive.priorities.push(...tableToPriorities(parseTable(tableLines)));
      }
      continue;
    }

    if (kind === 'operational' || kind === 'strategic') {
      const tableLines = body
        .split(/\r?\n/)
        .filter((l) => l.trim().startsWith('|'));
      if (tableLines.length >= 2) {
        const table = parseTable(tableLines);
        const title = cleanHeading(section.title);
        if (!chartedTableTitles.has(title)) {
          executive.statusRows.push(...tableToStatusRows(table));
        }
      }
    }
  }

  executive.achievements = uniqueItems(executive.achievements, 6);
  executive.challenges = uniqueItems(executive.challenges, 5);
  executive.recommendations = uniqueItems(executive.recommendations, 6);
  executive.priorities = executive.priorities.slice(0, 6);
  executive.statusRows = executive.statusRows.slice(0, 8);

  return executive;
};

/**
 * @returns {{ charts: object[], executive: object }}
 */
export const parseDepartmentReport = (markdown) => {
  const raw = String(markdown || '').replace(/\[cite:\s*\d+\]/gi, '');
  const emptyExecutive = {
    summary: '',
    achievements: [],
    challenges: [],
    recommendations: [],
    priorities: [],
    statusRows: [],
  };
  if (!raw.trim()) return { charts: [], executive: emptyExecutive };

  const lines = raw.split(/\r?\n/);
  const charts = [];
  const chartedTableTitles = new Set();
  let currentHeading = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);

    if (headingMatch) {
      currentHeading = headingMatch[1];
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const tableLines = [line];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
        i += 1;
        tableLines.push(lines[i]);
      }
      const table = parseTable(tableLines);
      const chartOrCharts = tableToChart(table, cleanHeading(currentHeading));
      if (chartOrCharts) {
        chartedTableTitles.add(cleanHeading(currentHeading));
        const list = Array.isArray(chartOrCharts)
          ? chartOrCharts
          : [chartOrCharts];
        charts.push(...list);
      }
      i += 1;
      continue;
    }

    i += 1;
  }

  const fullText = stripNoise(raw);

  const scorecard = extractScorecard(fullText);
  if (scorecard) {
    charts.unshift(scorecard.chart);
  }

  const ops = extractOpsBullets(fullText, 'Operational KPI performance');
  if (ops) {
    const exists = charts.some(
      (c) =>
        c.type === 'targetActual' &&
        c.points.length === ops.chart.points.length &&
        c.points.every(
          (p, idx) => p.actual === ops.chart.points[idx]?.actual
        )
    );
    if (!exists) charts.push(ops.chart);
  }

  const pie = extractAttendancePie(fullText);
  if (pie) charts.push(pie.chart);

  const sections = splitSections(raw);
  const executive = buildExecutive(sections, chartedTableTitles);

  return { charts, executive };
};

export default parseDepartmentReport;
