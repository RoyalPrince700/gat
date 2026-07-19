const {
  DEFAULT_MARGIN_PCT,
  ALERT_THRESHOLDS,
  ACQUISITION_SOURCE_VALUES,
} = require('./smipayGrowthMeta');

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;
const SPEND_CATEGORIES = new Set([
  'airtime',
  'data',
  'electricity',
  'exam_body',
  'cable_tv',
  'transfer',
  'other',
  'betting',
]);

const pct = (num, den) =>
  den ? Math.round((num / den) * 1000) / 10 : 0;

const startOfWeek = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
};

const toWeekKey = (d) => startOfWeek(d).toISOString().slice(0, 10);

const groupByCustomer = (records) => {
  const map = {};
  records.forEach((r) => {
    const id = String(r.customer);
    if (!map[id]) map[id] = [];
    map[id].push(r);
  });
  Object.values(map).forEach((list) =>
    list.sort((a, b) => new Date(a.date) - new Date(b.date))
  );
  return map;
};

/** Phase A: deposit → spend within 24h / 7d */
const buildDepositSpend = (allRecords, rangeFrom, rangeTo) => {
  const deposits = allRecords.filter(
    (r) =>
      r.category === 'deposit' &&
      new Date(r.date) >= rangeFrom &&
      new Date(r.date) <= rangeTo
  );
  const byCustomer = groupByCustomer(allRecords);

  let spent24h = 0;
  let spent7d = 0;
  const byWeek = {};

  deposits.forEach((dep) => {
    const depAt = new Date(dep.date);
    const week = toWeekKey(depAt);
    if (!byWeek[week]) {
      byWeek[week] = { period: week, deposits: 0, spent24h: 0, spent7d: 0 };
    }
    byWeek[week].deposits += 1;

    const txns = byCustomer[String(dep.customer)] || [];
    const hasSpend = (withinMs) =>
      txns.some((t) => {
        if (!SPEND_CATEGORIES.has(t.category)) return false;
        const tAt = new Date(t.date);
        return tAt > depAt && tAt - depAt <= withinMs;
      });

    if (hasSpend(MS_DAY)) {
      spent24h += 1;
      byWeek[week].spent24h += 1;
    }
    if (hasSpend(7 * MS_DAY)) {
      spent7d += 1;
      byWeek[week].spent7d += 1;
    }
  });

  const trend = Object.values(byWeek)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => ({
      ...row,
      rate24hPct: pct(row.spent24h, row.deposits),
      rate7dPct: pct(row.spent7d, row.deposits),
    }));

  return {
    summary: {
      deposits: deposits.length,
      spentWithin24h: spent24h,
      spentWithin7d: spent7d,
      rate24hPct: pct(spent24h, deposits.length),
      rate7dPct: pct(spent7d, deposits.length),
    },
    trend,
  };
};

/** Phase A: 2nd transaction rate */
const buildSecondTxn = (customers, allRecords, rangeFrom, rangeTo) => {
  const byCustomer = groupByCustomer(allRecords);
  const joined = customers.filter((c) => {
    if (!c.joinedAt) return false;
    const j = new Date(c.joinedAt);
    return j >= rangeFrom && j <= rangeTo;
  });

  let withFirst = 0;
  let withSecond = 0;
  let totalHoursToSecond = 0;
  let secondSamples = 0;
  const byWeek = {};

  joined.forEach((c) => {
    const week = toWeekKey(c.joinedAt);
    if (!byWeek[week]) {
      byWeek[week] = { period: week, joined: 0, withSecond: 0, ratePct: 0 };
    }
    byWeek[week].joined += 1;

    const txns = byCustomer[String(c._id)] || [];
    if (txns.length >= 1) withFirst += 1;
    if (txns.length >= 2) {
      withSecond += 1;
      byWeek[week].withSecond += 1;
      const hours =
        (new Date(txns[1].date) - new Date(txns[0].date)) / (60 * 60 * 1000);
      if (hours >= 0) {
        totalHoursToSecond += hours;
        secondSamples += 1;
      }
    }
  });

  Object.values(byWeek).forEach((row) => {
    row.ratePct = pct(row.withSecond, row.joined);
  });

  return {
    summary: {
      joined: joined.length,
      withFirstTxn: withFirst,
      withSecondTxn: withSecond,
      secondTxnRatePct: pct(withSecond, joined.length),
      medianishHoursToSecond: secondSamples
        ? Math.round((totalHoursToSecond / secondSamples) * 10) / 10
        : 0,
    },
    byJoinWeek: Object.values(byWeek).sort((a, b) =>
      a.period.localeCompare(b.period)
    ),
  };
};

/** Phase A: dormancy bands */
const buildDormancy = (customers, now = new Date()) => {
  const bands = {
    active_7d: 0,
    d7_14: 0,
    d14_30: 0,
    d30_60: 0,
    d60_plus: 0,
    never: 0,
  };

  customers.forEach((c) => {
    if (!c.lastTransactionAt) {
      bands.never += 1;
      return;
    }
    const days = Math.floor(
      (now - new Date(c.lastTransactionAt)) / MS_DAY
    );
    if (days <= 7) bands.active_7d += 1;
    else if (days <= 14) bands.d7_14 += 1;
    else if (days <= 30) bands.d14_30 += 1;
    else if (days <= 60) bands.d30_60 += 1;
    else bands.d60_plus += 1;
  });

  const labels = [
    { key: 'active_7d', label: 'Active (≤7d)' },
    { key: 'd7_14', label: '7–14 days' },
    { key: 'd14_30', label: '14–30 days' },
    { key: 'd30_60', label: '30–60 days' },
    { key: 'd60_plus', label: '60+ days' },
    { key: 'never', label: 'Never transacted' },
  ];

  const total = customers.length;
  return {
    summary: {
      total,
      dormant30Plus: bands.d30_60 + bands.d60_plus,
      dormant30PlusPct: pct(bands.d30_60 + bands.d60_plus, total),
    },
    bands: labels.map((l) => ({
      band: l.key,
      label: l.label,
      count: bands[l.key],
      pct: pct(bands[l.key], total),
    })),
  };
};

/** Phase A: channel quality */
const buildChannelQuality = (records, customers) => {
  const custById = Object.fromEntries(
    customers.map((c) => [String(c._id), c])
  );
  const channels = {};

  records.forEach((r) => {
    const ch = r.channel || 'other';
    if (!channels[ch]) {
      channels[ch] = {
        channel: ch,
        volume: 0,
        transactions: 0,
        pending: 0,
        customers: new Set(),
        activatedCustomers: new Set(),
      };
    }
    channels[ch].volume += r.totalAmount || 0;
    channels[ch].transactions += r.transactionCount || 0;
    channels[ch].records = (channels[ch].records || 0) + 1;
    if (r.status === 'pending') channels[ch].pending += 1;
    if (r.customer) {
      const id = String(r.customer);
      channels[ch].customers.add(id);
      const c = custById[id];
      if (c?.firstTransactionAt) channels[ch].activatedCustomers.add(id);
    }
  });

  return Object.values(channels)
    .map((row) => ({
      channel: row.channel,
      volume: row.volume,
      transactions: row.transactions,
      pending: row.pending,
      pendingRatePct: pct(row.pending, row.records || 1),
      uniqueCustomers: row.customers.size,
      activatedCustomers: row.activatedCustomers.size,
    }))
    .sort((a, b) => b.volume - a.volume);
};

/** Phase A: pending aging */
const buildPendingAging = (records, now = new Date()) => {
  let pending = 0;
  let resolved = 0;
  let openOver24h = 0;
  let totalResolveHours = 0;
  let resolveSamples = 0;
  const byCategory = {};

  records.forEach((r) => {
    const status = r.status || 'successful';
    const cat = r.category || 'other';
    if (!byCategory[cat]) {
      byCategory[cat] = { category: cat, pending: 0, resolved: 0, total: 0 };
    }
    byCategory[cat].total += 1;

    if (status === 'pending') {
      pending += 1;
      byCategory[cat].pending += 1;
      const ageH = (now - new Date(r.date)) / (60 * 60 * 1000);
      if (ageH > 24) openOver24h += 1;
    }
    if (status === 'resolved') {
      resolved += 1;
      byCategory[cat].resolved += 1;
      if (r.resolvedAt) {
        const hours =
          (new Date(r.resolvedAt) - new Date(r.date)) / (60 * 60 * 1000);
        if (hours >= 0) {
          totalResolveHours += hours;
          resolveSamples += 1;
        }
      }
    }
  });

  const total = records.length;
  return {
    summary: {
      pending,
      resolved,
      openOver24h,
      pendingRatePct: pct(pending, total),
      avgResolveHours: resolveSamples
        ? Math.round((totalResolveHours / resolveSamples) * 10) / 10
        : 0,
    },
    byCategory: Object.values(byCategory)
      .filter((r) => r.pending + r.resolved > 0)
      .sort((a, b) => b.pending - a.pending),
  };
};

/** Phase A: category attach (breadth) */
const buildCategoryAttach = (records) => {
  const byCustomer = {};
  records.forEach((r) => {
    const id = String(r.customer);
    if (!byCustomer[id]) byCustomer[id] = new Set();
    byCustomer[id].add(r.category);
  });

  const active = Object.values(byCustomer);
  const buckets = { one: 0, two: 0, threePlus: 0 };
  active.forEach((set) => {
    const n = set.size;
    if (n <= 1) buckets.one += 1;
    else if (n === 2) buckets.two += 1;
    else buckets.threePlus += 1;
  });

  return {
    summary: {
      activeCustomers: active.length,
      oneCategoryPct: pct(buckets.one, active.length),
      twoCategoriesPct: pct(buckets.two, active.length),
      threePlusPct: pct(buckets.threePlus, active.length),
      avgCategories:
        active.length === 0
          ? 0
          : Math.round(
              (active.reduce((s, set) => s + set.size, 0) / active.length) * 10
            ) / 10,
    },
    buckets: [
      { label: '1 category', count: buckets.one, pct: pct(buckets.one, active.length) },
      { label: '2 categories', count: buckets.two, pct: pct(buckets.two, active.length) },
      {
        label: '3+ categories',
        count: buckets.threePlus,
        pct: pct(buckets.threePlus, active.length),
      },
    ],
  };
};

/** Phase A: top 10% volume concentration */
const buildConcentration = (records) => {
  const byCustomer = {};
  records.forEach((r) => {
    const id = String(r.customer);
    if (!byCustomer[id]) {
      byCustomer[id] = {
        customerId: id,
        customerName: r.customerName || id,
        volume: 0,
        transactions: 0,
      };
    }
    byCustomer[id].volume += r.totalAmount || 0;
    byCustomer[id].transactions += r.transactionCount || 0;
  });

  const ranked = Object.values(byCustomer).sort((a, b) => b.volume - a.volume);
  const totalVolume = ranked.reduce((s, r) => s + r.volume, 0);
  const topN = Math.max(1, Math.ceil(ranked.length * 0.1));
  const top = ranked.slice(0, topN);
  const topVolume = top.reduce((s, r) => s + r.volume, 0);

  return {
    summary: {
      customers: ranked.length,
      top10Count: top.length,
      top10Volume: topVolume,
      top10SharePct: pct(topVolume, totalVolume),
      totalVolume,
    },
    topCustomers: top.slice(0, 8),
  };
};

/** Phase A: cohort LTV proxy at D7/D30/D90 */
const buildCohortLtv = (customers, allRecords, rangeFrom, rangeTo) => {
  const byCustomer = groupByCustomer(allRecords);
  const joined = customers.filter((c) => {
    if (!c.joinedAt) return false;
    const j = new Date(c.joinedAt);
    return j >= rangeFrom && j <= rangeTo;
  });

  const cohorts = {};
  joined.forEach((c) => {
    const week = toWeekKey(c.joinedAt);
    if (!cohorts[week]) {
      cohorts[week] = {
        period: week,
        size: 0,
        volumeD7: 0,
        volumeD30: 0,
        volumeD90: 0,
      };
    }
    cohorts[week].size += 1;
    const join = new Date(c.joinedAt);
    const txns = byCustomer[String(c._id)] || [];
    txns.forEach((t) => {
      const days = (new Date(t.date) - join) / MS_DAY;
      if (days < 0) return;
      if (days <= 7) cohorts[week].volumeD7 += t.totalAmount || 0;
      if (days <= 30) cohorts[week].volumeD30 += t.totalAmount || 0;
      if (days <= 90) cohorts[week].volumeD90 += t.totalAmount || 0;
    });
  });

  return Object.values(cohorts)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => ({
      ...row,
      arpuD7: row.size ? Math.round(row.volumeD7 / row.size) : 0,
      arpuD30: row.size ? Math.round(row.volumeD30 / row.size) : 0,
      arpuD90: row.size ? Math.round(row.volumeD90 / row.size) : 0,
    }));
};

/** Phase B/C: acquisition source breakdown */
const buildAcquisition = (customers, allRecords, rangeFrom, rangeTo) => {
  const joined = customers.filter((c) => {
    if (!c.joinedAt) return false;
    const j = new Date(c.joinedAt);
    return j >= rangeFrom && j <= rangeTo;
  });
  const volumeByCustomer = {};
  allRecords.forEach((r) => {
    const id = String(r.customer);
    volumeByCustomer[id] = (volumeByCustomer[id] || 0) + (r.totalAmount || 0);
  });

  const bySource = {};
  ACQUISITION_SOURCE_VALUES.forEach((s) => {
    bySource[s] = { source: s, joined: 0, activated: 0, volume: 0 };
  });

  joined.forEach((c) => {
    const src = c.acquisitionSource || 'organic';
    if (!bySource[src]) {
      bySource[src] = { source: src, joined: 0, activated: 0, volume: 0 };
    }
    bySource[src].joined += 1;
    if (c.firstTransactionAt) bySource[src].activated += 1;
    bySource[src].volume += volumeByCustomer[String(c._id)] || 0;
  });

  return Object.values(bySource)
    .filter((r) => r.joined > 0)
    .map((r) => ({
      ...r,
      activationPct: pct(r.activated, r.joined),
    }))
    .sort((a, b) => b.joined - a.joined);
};

/** Phase B: failure reasons */
const buildFailureReasons = (records) => {
  const map = {};
  records.forEach((r) => {
    if (!r.failureReason) return;
    if (!map[r.failureReason]) {
      map[r.failureReason] = { reason: r.failureReason, count: 0, volume: 0 };
    }
    map[r.failureReason].count += 1;
    map[r.failureReason].volume += r.totalAmount || 0;
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
};

/** Phase B: deposit payment methods */
const buildPaymentMethods = (records) => {
  const map = {};
  records
    .filter((r) => r.category === 'deposit')
    .forEach((r) => {
      const method = r.paymentMethod || 'unknown';
      if (!map[method]) {
        map[method] = { method, volume: 0, transactions: 0 };
      }
      map[method].volume += r.totalAmount || 0;
      map[method].transactions += r.transactionCount || 0;
    });
  return Object.values(map).sort((a, b) => b.volume - a.volume);
};

/** Phase C: campaign / promo attribution */
const buildCampaigns = (records, customers) => {
  const map = {};
  const custSource = Object.fromEntries(
    customers.map((c) => [String(c._id), c.acquisitionSource || 'organic'])
  );

  records.forEach((r) => {
    const code = (r.promoCode || '').trim().toLowerCase();
    if (!code) return;
    if (!map[code]) {
      map[code] = {
        promoCode: code,
        volume: 0,
        transactions: 0,
        customers: new Set(),
        campaignCustomers: 0,
      };
    }
    map[code].volume += r.totalAmount || 0;
    map[code].transactions += r.transactionCount || 0;
    if (r.customer) {
      const id = String(r.customer);
      map[code].customers.add(id);
      if (custSource[id] === 'campaign') map[code].campaignCustomers += 1;
    }
  });

  return Object.values(map)
    .map((row) => ({
      promoCode: row.promoCode,
      volume: row.volume,
      transactions: row.transactions,
      uniqueCustomers: row.customers.size,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 15);
};

/** Phase C: geo heatmap */
const buildGeo = (customers, allRecords, rangeFrom, rangeTo) => {
  const joined = customers.filter((c) => {
    if (!c.joinedAt) return false;
    const j = new Date(c.joinedAt);
    return j >= rangeFrom && j <= rangeTo;
  });
  const volumeByCustomer = {};
  allRecords.forEach((r) => {
    if (new Date(r.date) < rangeFrom || new Date(r.date) > rangeTo) return;
    const id = String(r.customer);
    volumeByCustomer[id] = (volumeByCustomer[id] || 0) + (r.totalAmount || 0);
  });

  const map = {};
  const pool = joined.length ? joined : customers;
  pool.forEach((c) => {
    const state = c.geoState || 'Unknown';
    if (!map[state]) {
      map[state] = { state, customers: 0, volume: 0, activated: 0 };
    }
    map[state].customers += 1;
    map[state].volume += volumeByCustomer[String(c._id)] || 0;
    if (c.firstTransactionAt) map[state].activated += 1;
  });

  return Object.values(map)
    .filter((r) => r.customers > 0)
    .map((r) => ({
      ...r,
      activationPct: pct(r.activated, r.customers),
    }))
    .sort((a, b) => b.volume - a.volume || b.customers - a.customers)
    .slice(0, 20);
};

/** Phase C: margin by category */
const buildMargin = (records) => {
  const map = {};
  records.forEach((r) => {
    const cat = r.category || 'other';
    if (!map[cat]) {
      map[cat] = { category: cat, volume: 0, cost: 0, margin: 0, records: 0 };
    }
    const volume = r.totalAmount || 0;
    map[cat].volume += volume;
    map[cat].records += 1;

    let cost = 0;
    if (r.providerCost != null && r.providerCost >= 0) {
      cost = r.providerCost;
    } else {
      const rate = (DEFAULT_MARGIN_PCT[cat] ?? 1) / 100;
      // estimated cost = volume * (1 - margin%)
      cost = volume * (1 - rate);
    }
    map[cat].cost += cost;
    map[cat].margin += volume - cost;
  });

  return Object.values(map)
    .map((row) => ({
      ...row,
      marginPct: pct(row.margin, row.volume),
      estimated: true,
    }))
    .sort((a, b) => b.margin - a.margin);
};

/** Phase C: alert rules */
const buildAlerts = ({
  airtimeSection,
  depositSpend,
  pendingAging,
  now = new Date(),
}) => {
  const alerts = [];
  const t = ALERT_THRESHOLDS;

  const wow = airtimeSection?.summary?.wowVolumePct;
  if (wow != null && wow <= -t.airtimeWowDropPct) {
    alerts.push({
      id: 'airtime_wow_drop',
      severity: 'critical',
      title: 'Airtime volume drop',
      message: `Airtime week-over-week volume is ${wow}% (threshold −${t.airtimeWowDropPct}%).`,
      value: wow,
    });
  }

  const pendingRate = pendingAging?.summary?.pendingRatePct || 0;
  if (pendingRate >= t.pendingRatePct) {
    alerts.push({
      id: 'pending_rate_high',
      severity: 'warning',
      title: 'High pending rate',
      message: `Pending transactions are ${pendingRate}% of volume in range (threshold ${t.pendingRatePct}%).`,
      value: pendingRate,
    });
  }

  const open24 = pendingAging?.summary?.openOver24h || 0;
  if (open24 >= t.pendingOpenOver24h) {
    alerts.push({
      id: 'pending_aging',
      severity: 'critical',
      title: 'Stale pending transactions',
      message: `${open24} pending txns older than 24h (threshold ${t.pendingOpenOver24h}).`,
      value: open24,
    });
  }

  const spendTrend = depositSpend?.trend || [];
  if (spendTrend.length >= 2) {
    const prev = spendTrend[spendTrend.length - 2];
    const curr = spendTrend[spendTrend.length - 1];
    if (prev.rate7dPct > 0) {
      const drop = prev.rate7dPct - curr.rate7dPct;
      if (drop >= t.depositSpendDropPct) {
        alerts.push({
          id: 'deposit_spend_drop',
          severity: 'warning',
          title: 'Deposit→spend conversion drop',
          message: `7-day deposit→spend fell from ${prev.rate7dPct}% to ${curr.rate7dPct}%.`,
          value: drop,
        });
      }
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'all_clear',
      severity: 'ok',
      title: 'No critical alerts',
      message: `Checked at ${now.toISOString()}. Key growth KPIs are within thresholds.`,
      value: 0,
    });
  }

  return alerts;
};

/**
 * Build Phase A + B + C growth analytics.
 * `rangeRecords` — txns in filter range
 * `allRecords` — broader history for funnels/LTV (at least customers' history)
 */
const buildGrowthAnalytics = ({
  rangeRecords,
  allRecords,
  customers,
  rangeFrom,
  rangeTo,
  airtimeSection,
}) => {
  const now = new Date();
  const depositSpend = buildDepositSpend(allRecords, rangeFrom, rangeTo);
  const secondTxn = buildSecondTxn(customers, allRecords, rangeFrom, rangeTo);
  const dormancy = buildDormancy(customers, now);
  const channelQuality = buildChannelQuality(rangeRecords, customers);
  const pendingAging = buildPendingAging(rangeRecords, now);
  const categoryAttach = buildCategoryAttach(rangeRecords);
  const concentration = buildConcentration(rangeRecords);
  const cohortLtv = buildCohortLtv(customers, allRecords, rangeFrom, rangeTo);
  const acquisition = buildAcquisition(customers, allRecords, rangeFrom, rangeTo);
  const failureReasons = buildFailureReasons(rangeRecords);
  const paymentMethods = buildPaymentMethods(rangeRecords);
  const campaigns = buildCampaigns(rangeRecords, customers);
  const geo = buildGeo(customers, allRecords, rangeFrom, rangeTo);
  const margin = buildMargin(rangeRecords);
  const alerts = buildAlerts({
    airtimeSection,
    depositSpend,
    pendingAging,
    now,
  });

  return {
    northStars: {
      depositSpend7dPct: depositSpend.summary.rate7dPct,
      secondTxnRatePct: secondTxn.summary.secondTxnRatePct,
      dormant30PlusPct: dormancy.summary.dormant30PlusPct,
      pendingRatePct: pendingAging.summary.pendingRatePct,
      top10SharePct: concentration.summary.top10SharePct,
      avgCategories: categoryAttach.summary.avgCategories,
    },
    depositSpend,
    secondTxn,
    dormancy,
    channelQuality,
    pendingAging,
    categoryAttach,
    concentration,
    cohortLtv,
    acquisition,
    failureReasons,
    paymentMethods,
    campaigns,
    geo,
    margin,
    alerts,
  };
};

module.exports = {
  buildGrowthAnalytics,
  SPEND_CATEGORIES,
};
