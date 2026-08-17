const AccessibleSchoolPurchase = require('../models/AccessibleSchoolPurchase');
const { ACCESSIBLE_SEASONS } = require('./accessibleMeta');
const { isJunkSchoolName, isCanonicalSeason } = require('./accessibleSchoolName');
const {
  NAIRA_PER_POINT,
  GIFT_COST_PER_POINT,
  GIFT_COST_RANGE,
  SPEND_SEGMENTS,
  LOYALTY_TIERS,
  GIFT_LADDER,
  spendToPoints,
  segmentForSpend,
  tierForSegment,
  isLikelyBookshop,
} = require('./accessibleLoyalty');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const share = (part, whole) => (whole > 0 ? part / whole : 0);

const quantile = (sorted, q) => {
  if (!sorted.length) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[Math.min(sorted.length - 1, base + 1)];
  return sorted[base] + (next - sorted[base]) * rest;
};

const medianOf = (sorted) => {
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
};

const coverageFor = (schoolCount, maxSchools) => {
  if (!schoolCount) return 'empty';
  if (maxSchools > 0 && schoolCount < maxSchools * 0.2) return 'thin';
  return 'full';
};

const buildSchoolMap = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const name = String(row.schoolName || '').trim();
    const key = name.toLowerCase();
    const amount = Number(row.amount) || 0;
    const existing = map.get(key) || {
      schoolName: name,
      amount: 0,
      rowCount: 0,
      seasons: new Set(),
      bySeason: {},
    };
    existing.amount += amount;
    existing.rowCount += 1;
    if (row.season) {
      existing.seasons.add(row.season);
      existing.bySeason[row.season] = (existing.bySeason[row.season] || 0) + amount;
    }
    map.set(key, existing);
  }
  return map;
};

const decorateSchool = (school, nairaPerPoint) => {
  const amount = round2(school.amount);
  const segment = segmentForSpend(amount);
  const tier = tierForSegment(segment.id);
  return {
    schoolName: school.schoolName,
    amount,
    rowCount: school.rowCount,
    seasons: Array.from(school.seasons || []).sort(),
    segment: segment.id,
    segmentLabel: segment.label,
    points: spendToPoints(amount, nairaPerPoint),
    tier: tier.id,
    tierLabel: tier.label,
    likelyBookshop: isLikelyBookshop(school.schoolName),
  };
};

const concentrationFrom = (sortedDesc, totalAmount) => {
  const n = sortedDesc.length;
  const cum = [];
  let running = 0;
  for (let i = 0; i < n; i += 1) {
    running += sortedDesc[i].amount;
    cum.push(running);
  }
  const shareOf = (count) => {
    const c = Math.min(Math.max(0, count), n);
    const amount = c ? cum[c - 1] : 0;
    return { count: c, amount: round2(amount), share: share(amount, totalAmount) };
  };
  const countForShare = (target) => {
    if (!n || totalAmount <= 0) return 0;
    for (let i = 0; i < n; i += 1) {
      if (cum[i] >= totalAmount * target) return i + 1;
    }
    return n;
  };

  const top10PercentCount = n ? Math.max(1, Math.round(n * 0.1)) : 0;
  const clientsFor10PercentRevenue = countForShare(0.1);
  const clientsFor50PercentRevenue = countForShare(0.5);
  const clientsFor80PercentRevenue = countForShare(0.8);

  const marks = new Set(
    [1, 5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 300, 500, 720, 1000, n]
      .concat([
        top10PercentCount,
        clientsFor10PercentRevenue,
        clientsFor50PercentRevenue,
        clientsFor80PercentRevenue,
      ])
      .filter((v) => v > 0 && v <= n)
  );
  for (let i = 50; i < n; i += 50) marks.add(i);

  const pareto = Array.from(marks)
    .sort((a, b) => a - b)
    .map((rank) => ({
      rank,
      amount: round2(cum[rank - 1]),
      share: share(cum[rank - 1], totalAmount),
    }));

  return {
    top10: shareOf(10),
    top15: shareOf(15),
    top50: shareOf(50),
    top100: shareOf(100),
    top10PercentClients: shareOf(top10PercentCount),
    clientsFor10PercentRevenue,
    clientsFor50PercentRevenue,
    clientsFor80PercentRevenue,
    pareto,
  };
};

const retentionFrom = (schoolMap) => {
  const a = '2023-2024';
  const b = '2024-2025';
  let both = 0;
  let onlyA = 0;
  let onlyB = 0;
  let grew = 0;
  let shrunk = 0;
  let unchanged = 0;
  let repeatClients = 0;
  let oneSeasonClients = 0;

  schoolMap.forEach((school) => {
    const seasons = school.seasons;
    if (seasons.size >= 2) repeatClients += 1;
    else oneSeasonClients += 1;

    const inA = seasons.has(a);
    const inB = seasons.has(b);
    if (inA && inB) {
      both += 1;
      const spendA = school.bySeason[a] || 0;
      const spendB = school.bySeason[b] || 0;
      if (spendB > spendA) grew += 1;
      else if (spendB < spendA) shrunk += 1;
      else unchanged += 1;
    } else if (inA) onlyA += 1;
    else if (inB) onlyB += 1;
  });

  return {
    seasonsCompared: [a, b],
    both,
    onlyA,
    onlyB,
    grew,
    shrunk,
    unchanged,
    repeatClients,
    oneSeasonClients,
    note:
      '2023-2024 is a thin file (~90 schools), so repeat counts are biased low until 2025-2026 is uploaded. Do not launch two-year tiering on this overlap alone.',
  };
};

const buildInsights = ({
  kpis,
  segments,
  bySeason,
  retention,
  concentration,
  bookshops,
  season,
}) => {
  const naira = (n) => `₦${Math.round(n || 0).toLocaleString('en-NG')}`;
  const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
  const insights = [];

  if (!kpis.schoolCount) {
    if (season === '2025-2026') {
      insights.push({
        title: '2025-2026 is not uploaded yet',
        body: 'Upload that season on School purchases before comparing a full three-year picture or launching multi-year loyalty tiers.',
      });
    } else {
      insights.push({
        title: 'No clean purchase rows in this view',
        body: 'Upload season Excel files on School purchases to build this briefing.',
      });
    }
    return insights;
  }

  insights.push({
    title: 'Typical vs heavy buyers',
    body: `A typical client spent ${naira(kpis.medianSpend)} (median). Average is ${naira(kpis.averageSpend)} because a few dozen names sit far above that.`,
  });

  const key = segments.find((s) => s.id === 'key');
  const strategic = segments.find((s) => s.id === 'strategic');
  const keyPlusShare =
    (key?.revenueShare || 0) + (strategic?.revenueShare || 0);
  const keyPlusClients =
    (key?.clientShare || 0) + (strategic?.clientShare || 0);
  if (key) {
    insights.push({
      title: 'Key accounts carry the book',
      body: `₦1m+ clients are ${fmtPct(keyPlusClients)} of names and ${fmtPct(keyPlusShare)} of spend. Loyalty should make Key and Strategic accounts feel recognised — not the same gift as a ₦50k buyer.`,
    });
  }

  const occasional = segments.find((s) => s.id === 'occasional');
  if (occasional) {
    insights.push({
      title: 'The long tail is cheap to include',
      body: `Occasional buyers are ${fmtPct(occasional.clientShare)} of names and ${fmtPct(occasional.revenueShare)} of money. Include them at a low earn rate; flat gifts would waste budget on 0.5%-of-revenue clients.`,
    });
  }

  const thin = bySeason.filter((s) => s.coverage === 'thin');
  const empty = bySeason.filter((s) => s.coverage === 'empty');
  if (thin.length) {
    insights.push({
      title: `${thin.map((s) => s.season).join(', ')} coverage is thin`,
      body: `${thin[0].season} has ${thin[0].schoolCount} clients vs the full volume year. Do not treat it as a comparable academic year or as two-year loyalty proof.`,
    });
  }
  if (empty.length) {
    insights.push({
      title: `${empty.map((s) => s.season).join(', ')} still pending`,
      body: 'Repeat-customer counts will jump once that file is loaded. Hold off launching multi-year tiering until then.',
    });
  }

  if (concentration?.top10PercentClients) {
    insights.push({
      title: 'Concentration (Pareto)',
      body: `The top 10% of clients (${concentration.top10PercentClients.count} names) account for ${fmtPct(concentration.top10PercentClients.share)} of revenue. Top ${concentration.clientsFor50PercentRevenue} clients ≈ 50% of sales; top ${concentration.clientsFor80PercentRevenue} ≈ 80%.`,
    });
  }

  if (bookshops.count) {
    insights.push({
      title: 'Not every “school” is a school',
      body: `${bookshops.count} names look like bookshops or distributors (${fmtPct(bookshops.share)} of spend). Treat them as trade clients in loyalty design, not the same as a nursery/primary school.`,
    });
  }

  if (retention?.both) {
    insights.push({
      title: 'Repeat buyers (biased sample)',
      body: `${retention.both} clients appear in both 2023-2024 and 2024-2025 (${retention.grew} grew spend, ${retention.shrunk} shrank). ${retention.onlyB} names are 2024-2025 only — mostly because the earlier file is small, not because churn is that high.`,
    });
  }

  return insights.slice(0, 7);
};

const buildPurchaseAnalytics = async (
  companyId,
  { season = 'all', nairaPerPoint, giftCostPerPoint } = {}
) => {
  const rate =
    Number(nairaPerPoint) > 0 ? Number(nairaPerPoint) : NAIRA_PER_POINT;
  const giftCost =
    Number(giftCostPerPoint) > 0
      ? Number(giftCostPerPoint)
      : GIFT_COST_PER_POINT;

  const rows = await AccessibleSchoolPurchase.find({ company: companyId })
    .select('schoolName amount season')
    .lean();

  const junkRows = [];
  const cleanRows = [];
  for (const row of rows) {
    if (isJunkSchoolName(row.schoolName)) junkRows.push(row);
    else cleanRows.push(row);
  }

  const rawTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const rawSchools = new Set(
    rows.map((r) => String(r.schoolName || '').trim().toLowerCase())
  );
  const junkAmount = junkRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const junkSchools = new Set(
    junkRows.map((r) => String(r.schoolName || '').trim().toLowerCase())
  );

  const allSchoolMap = buildSchoolMap(cleanRows);
  const selectedSeason =
    season && season !== 'all' && isCanonicalSeason(season) ? season : 'all';

  const scoped = [];
  allSchoolMap.forEach((school) => {
    const amount =
      selectedSeason === 'all'
        ? school.amount
        : school.bySeason[selectedSeason] || 0;
    if (amount <= 0) return;
    scoped.push({
      schoolName: school.schoolName,
      amount,
      rowCount: school.rowCount,
      seasons: school.seasons,
    });
  });

  if (selectedSeason !== 'all') {
    const seasonRowCounts = new Map();
    for (const row of cleanRows) {
      if (row.season !== selectedSeason) continue;
      const key = String(row.schoolName || '').trim().toLowerCase();
      seasonRowCounts.set(key, (seasonRowCounts.get(key) || 0) + 1);
    }
    scoped.forEach((s) => {
      s.rowCount = seasonRowCounts.get(s.schoolName.toLowerCase()) || 1;
    });
  }

  const decorated = scoped
    .map((s) => decorateSchool(s, rate))
    .sort(
      (a, b) => b.amount - a.amount || a.schoolName.localeCompare(b.schoolName)
    );

  const totalAmount = decorated.reduce((s, r) => s + r.amount, 0);
  const amounts = decorated.map((s) => s.amount).sort((a, b) => a - b);
  const schoolCount = decorated.length;
  const rowCount =
    selectedSeason === 'all'
      ? cleanRows.length
      : cleanRows.filter((r) => r.season === selectedSeason).length;

  const seasonMap = new Map();
  ACCESSIBLE_SEASONS.forEach((s) => {
    seasonMap.set(s, {
      season: s,
      rowCount: 0,
      schoolKeys: new Set(),
      totalAmount: 0,
    });
  });
  for (const row of cleanRows) {
    const sm = seasonMap.get(row.season);
    if (!sm) continue;
    sm.rowCount += 1;
    sm.schoolKeys.add(String(row.schoolName || '').trim().toLowerCase());
    sm.totalAmount += Number(row.amount) || 0;
  }
  const maxSeasonSchools = Math.max(
    0,
    ...ACCESSIBLE_SEASONS.map((s) => seasonMap.get(s).schoolKeys.size)
  );
  const bySeason = ACCESSIBLE_SEASONS.map((s) => {
    const sm = seasonMap.get(s);
    const count = sm.schoolKeys.size;
    return {
      season: s,
      rowCount: sm.rowCount,
      schoolCount: count,
      totalAmount: round2(sm.totalAmount),
      coverage: coverageFor(count, maxSeasonSchools),
    };
  });

  const concentration = concentrationFrom(decorated, totalAmount);

  const segmentStats = SPEND_SEGMENTS.map((seg) => {
    const members = decorated.filter((s) => s.segment === seg.id);
    const revenue = members.reduce((s, r) => s + r.amount, 0);
    const points = members.reduce((s, r) => s + r.points, 0);
    return {
      id: seg.id,
      label: seg.label,
      min: seg.min,
      max: seg.max,
      tier: seg.tier,
      loyaltyRole: seg.loyaltyRole,
      schoolCount: members.length,
      clientShare: share(members.length, schoolCount),
      revenue: round2(revenue),
      revenueShare: share(revenue, totalAmount),
      points,
    };
  });

  const tierStats = LOYALTY_TIERS.map((tier) => {
    const members = decorated.filter((s) => s.tier === tier.id);
    const revenue = members.reduce((s, r) => s + r.amount, 0);
    const points = members.reduce((s, r) => s + r.points, 0);
    return {
      id: tier.id,
      label: tier.label,
      from: tier.from,
      schoolCount: members.length,
      clientShare: share(members.length, schoolCount),
      revenue: round2(revenue),
      revenueShare: share(revenue, totalAmount),
      points,
    };
  });

  const totalPoints = decorated.reduce((s, r) => s + r.points, 0);
  const estimatedGiftBudget = totalPoints * giftCost;
  const ladder = GIFT_LADDER.map((rung, i) => {
    const next = GIFT_LADDER[i + 1];
    const giftValue = rung.points * giftCost;
    const schoolsAtOrAbove = decorated.filter((s) => s.points >= rung.points).length;
    const clientsInRung = decorated.filter(
      (s) =>
        s.points >= rung.points && (next ? s.points < next.points : true)
    ).length;
    return {
      ...rung,
      spendEquivalent: rung.points * rate,
      giftValue,
      schoolsAtOrAbove,
      clientsInRung,
      categoryTotal: giftValue * clientsInRung,
    };
  });

  const bookshopSchools = decorated.filter((s) => s.likelyBookshop);
  const bookshopSpend = bookshopSchools.reduce((s, r) => s + r.amount, 0);
  const bookshops = {
    count: bookshopSchools.length,
    spend: round2(bookshopSpend),
    share: share(bookshopSpend, totalAmount),
  };

  const retention = retentionFrom(allSchoolMap);
  const repeatInView = decorated.filter((s) => s.seasons.length >= 2).length;
  const oneSeasonInView = decorated.length - repeatInView;

  const kpis = {
    totalSales: round2(totalAmount),
    schoolCount,
    rowCount,
    averageSpend: schoolCount ? round2(totalAmount / schoolCount) : 0,
    medianSpend: round2(medianOf(amounts)),
    p75: round2(quantile(amounts, 0.75)),
    p90: round2(quantile(amounts, 0.9)),
    p95: round2(quantile(amounts, 0.95)),
    min: amounts.length ? round2(amounts[0]) : 0,
    max: amounts.length ? round2(amounts[amounts.length - 1]) : 0,
    top10PercentRevenueShare: concentration.top10PercentClients.share,
    repeatClients: selectedSeason === 'all' ? retention.repeatClients : repeatInView,
    oneSeasonClients:
      selectedSeason === 'all' ? retention.oneSeasonClients : oneSeasonInView,
  };

  const loyaltyPreview = {
    nairaPerPoint: rate,
    giftCostPerPoint: giftCost,
    giftCostRange: GIFT_COST_RANGE,
    totalPoints,
    estimatedGiftBudget: round2(estimatedGiftBudget),
    budgetShareOfSales: share(estimatedGiftBudget, totalAmount),
    bySegment: segmentStats.map((s) => ({
      id: s.id,
      label: s.label,
      tier: s.tier,
      schoolCount: s.schoolCount,
      points: s.points,
      revenue: s.revenue,
    })),
    byTier: tierStats,
    ladder,
    note: 'Gift cost per point is a planning assumption (not a warehouse cost). Historical 2023-2024 is incomplete — do not launch two-year loyalty until 2025-2026 is loaded.',
  };

  return {
    season: selectedSeason,
    seasons: ACCESSIBLE_SEASONS,
    raw: {
      rowCount: rows.length,
      schoolCount: rawSchools.size,
      totalAmount: round2(rawTotal),
    },
    clean: {
      rowCount: cleanRows.length,
      schoolCount: allSchoolMap.size,
      totalAmount: round2(
        cleanRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
      ),
    },
    excludedJunk: {
      rowCount: junkRows.length,
      schoolCount: junkSchools.size,
      totalAmount: round2(junkAmount),
      labels: Array.from(
        new Set(junkRows.map((r) => String(r.schoolName || '').trim()))
      ),
    },
    kpis,
    bySeason,
    segments: segmentStats,
    concentration,
    topSchools: decorated.slice(0, 20),
    retention,
    loyaltyPreview,
    bookshops,
    insights: buildInsights({
      kpis,
      segments: segmentStats,
      bySeason,
      retention,
      concentration,
      bookshops,
      season: selectedSeason,
    }),
    schools: decorated,
  };
};

module.exports = { buildPurchaseAnalytics };
