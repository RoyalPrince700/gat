const SmipayCustomer = require('../models/SmipayCustomer');
const SmipayRecord = require('../models/SmipayRecord');
const SocialMediaRecord = require('../models/SocialMediaRecord');
const { KPI_METRICS } = require('./smipayKpiMeta');

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/** Monday-start week in local server time */
const startOfWeek = (d) => {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
};

const startOfMonth = (d) => {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const getPeriodBounds = (period, asOf = new Date()) => {
  const now = new Date(asOf);
  let from;
  let to = endOfDay(now);
  let periodEnd;

  if (period === 'day') {
    from = startOfDay(now);
    periodEnd = endOfDay(now);
  } else if (period === 'week') {
    from = startOfWeek(now);
    periodEnd = endOfDay(addDays(from, 6));
  } else {
    from = startOfMonth(now);
    periodEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  }

  // Cap "to" at now for in-progress periods
  if (to > now) to = now;

  return { from, to, periodEnd, now };
};

const getPreviousPeriodBounds = (period, asOf = new Date()) => {
  const { from } = getPeriodBounds(period, asOf);
  if (period === 'day') {
    const prev = addDays(from, -1);
    return { from: startOfDay(prev), to: endOfDay(prev) };
  }
  if (period === 'week') {
    const prevStart = addDays(from, -7);
    return { from: prevStart, to: endOfDay(addDays(prevStart, 6)) };
  }
  const prevMonth = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  const prevEnd = endOfDay(new Date(from.getFullYear(), from.getMonth(), 0));
  return { from: startOfDay(prevMonth), to: prevEnd };
};

const metricMeta = (metric) =>
  KPI_METRICS.find((m) => m.value === metric) || {
    value: metric,
    label: metric,
    unit: 'count',
  };

async function computeNewUsers(from, to) {
  return SmipayCustomer.countDocuments({
    joinedAt: { $gte: from, $lte: to },
  });
}

async function computeTxnAgg(from, to, category = null) {
  const match = {
    date: { $gte: from, $lte: to },
  };
  if (category) match.category = category;

  const [row] = await SmipayRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        volume: { $sum: '$totalAmount' },
        txnCount: { $sum: '$transactionCount' },
        recordCount: { $sum: 1 },
        customers: { $addToSet: '$customer' },
      },
    },
  ]);

  return {
    volume: row?.volume || 0,
    txnCount: row?.txnCount || 0,
    recordCount: row?.recordCount || 0,
    activeCustomers: row?.customers?.length || 0,
  };
}

async function computeSocialFollowers(from, to, platform = 'all') {
  const match = {
    date: { $gte: from, $lte: to },
  };
  if (platform && platform !== 'all') match.platform = platform;

  const [row] = await SocialMediaRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        newFollowers: { $sum: '$newFollowers' },
      },
    },
  ]);

  return row?.newFollowers || 0;
}

async function computeActual(kpi, from, to) {
  const metric = kpi.metric;

  if (metric === 'new_users') {
    return computeNewUsers(from, to);
  }

  if (metric === 'social_followers') {
    return computeSocialFollowers(from, to, kpi.platform || 'all');
  }

  if (metric === 'deposit_volume') {
    const agg = await computeTxnAgg(from, to, 'deposit');
    return agg.volume;
  }

  if (metric === 'airtime_volume') {
    const agg = await computeTxnAgg(from, to, 'airtime');
    return agg.volume;
  }

  if (metric === 'data_volume') {
    const agg = await computeTxnAgg(from, to, 'data');
    return agg.volume;
  }

  if (metric === 'category_volume') {
    const agg = await computeTxnAgg(from, to, kpi.category || null);
    return agg.volume;
  }

  const agg = await computeTxnAgg(from, to);

  if (metric === 'transaction_volume') return agg.volume;
  if (metric === 'transaction_count') return agg.txnCount;
  if (metric === 'active_customers') return agg.activeCustomers;
  if (metric === 'avg_ticket') {
    if (!agg.txnCount) return 0;
    return Math.round(agg.volume / agg.txnCount);
  }

  return 0;
}

const evaluateStatus = (actual, target, from, periodEnd, now) => {
  const safeTarget = Number(target) || 0;
  const safeActual = Number(actual) || 0;
  const progressPct =
    safeTarget > 0 ? Math.round((safeActual / safeTarget) * 1000) / 10 : 0;
  const met = safeActual >= safeTarget && safeTarget > 0;

  const totalMs = Math.max(1, periodEnd.getTime() - from.getTime());
  const elapsedMs = Math.min(
    totalMs,
    Math.max(0, now.getTime() - from.getTime())
  );
  const elapsedPct = Math.round((elapsedMs / totalMs) * 1000) / 10;
  const expectedByNow = safeTarget * (elapsedMs / totalMs);
  const pacePct =
    expectedByNow > 0
      ? Math.round((safeActual / expectedByNow) * 1000) / 10
      : progressPct;

  let status = 'behind';
  if (met) status = 'met';
  else if (pacePct >= 100) status = 'on_track';
  else if (pacePct >= 75) status = 'at_risk';
  else status = 'behind';

  const remaining = Math.max(0, safeTarget - safeActual);

  return {
    actual: safeActual,
    target: safeTarget,
    progressPct,
    pacePct,
    elapsedPct,
    remaining,
    met,
    status,
  };
};

async function evaluateKpi(kpi, asOf = new Date()) {
  const meta = metricMeta(kpi.metric);
  const { from, to, periodEnd, now } = getPeriodBounds(kpi.period, asOf);
  const prev = getPreviousPeriodBounds(kpi.period, asOf);

  const [actual, previousActual] = await Promise.all([
    computeActual(kpi, from, to),
    computeActual(kpi, prev.from, prev.to),
  ]);

  const evaluation = evaluateStatus(actual, kpi.target, from, periodEnd, now);

  return {
    ...evaluation,
    previousActual,
    periodLabel: kpi.period,
    window: {
      from: from.toISOString(),
      to: to.toISOString(),
      periodEnd: periodEnd.toISOString(),
    },
    previousWindow: {
      from: prev.from.toISOString(),
      to: prev.to.toISOString(),
    },
    unit: meta.unit,
    metricLabel: meta.label,
  };
}

module.exports = {
  getPeriodBounds,
  getPreviousPeriodBounds,
  computeActual,
  evaluateKpi,
  metricMeta,
};
