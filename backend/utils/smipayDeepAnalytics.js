const SmipayRecord = require('../models/SmipayRecord');
const SmipayCustomer = require('../models/SmipayCustomer');
const { SMIPAY_NETWORK_VALUES } = require('./smipayNetworks');
const {
  TIME_OF_DAY_VALUES,
  AMOUNT_BUCKET_VALUES,
  TIME_OF_DAY_LABELS,
  AMOUNT_BUCKET_LABELS,
  resolveTimeOfDay,
  resolveAmountBucket,
} = require('./smipayAnalyticsBuckets');
const { buildGrowthAnalytics } = require('./smipayGrowthAnalytics');

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const startOfWeek = (d = new Date()) => {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
};

const startOfMonth = (d = new Date()) => {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
};

const toDayKey = (d) => new Date(d).toISOString().slice(0, 10);

const toWeekKey = (d) => {
  const start = startOfWeek(d);
  return toDayKey(start);
};

const toMonthKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
};

const resolveRange = (from, to) => {
  const now = new Date();
  let rangeFrom;
  let rangeTo;

  if (from) {
    rangeFrom = new Date(from);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(from))) {
      rangeFrom = startOfDay(rangeFrom);
    }
  } else {
    rangeFrom = new Date(now.getTime() - 90 * MS_DAY);
  }

  if (to) {
    rangeTo = new Date(to);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(to))) {
      rangeTo = endOfDay(rangeTo);
    }
  } else {
    rangeTo = endOfDay(now);
  }

  return { from: rangeFrom, to: rangeTo };
};

const emptyMetric = () => ({ volume: 0, transactions: 0, records: 0 });

const addMetric = (target, volume, transactions) => {
  target.volume += volume || 0;
  target.transactions += transactions || 0;
  target.records += 1;
};

const sortByPeriod = (map) =>
  Object.values(map).sort((a, b) => String(a.period).localeCompare(String(b.period)));

const ensureBuckets = (record) => {
  const timeOfDay =
    record.timeOfDay || resolveTimeOfDay(record.date) || 'night';
  const amountBucket =
    record.amountBucket ||
    resolveAmountBucket(
      record.totalAmount,
      record.transactionCount,
      record.averageAmount
    );
  return { timeOfDay, amountBucket };
};

const buildSeriesMaps = () => ({
  daily: {},
  weekly: {},
  monthly: {},
});

const bumpSeries = (series, date, volume, transactions) => {
  const day = toDayKey(date);
  const week = toWeekKey(date);
  const month = toMonthKey(date);

  if (!series.daily[day]) {
    series.daily[day] = { period: day, label: day, ...emptyMetric() };
  }
  addMetric(series.daily[day], volume, transactions);

  if (!series.weekly[week]) {
    series.weekly[week] = { period: week, label: `Week of ${week}`, ...emptyMetric() };
  }
  addMetric(series.weekly[week], volume, transactions);

  if (!series.monthly[month]) {
    series.monthly[month] = { period: month, label: month, ...emptyMetric() };
  }
  addMetric(series.monthly[month], volume, transactions);
};

const last4WeeksSeries = (weeklySorted, rangeTo) => {
  const endWeek = startOfWeek(rangeTo);
  const weeks = [];
  for (let i = 3; i >= 0; i -= 1) {
    const start = new Date(endWeek.getTime() - i * MS_WEEK);
    const key = toDayKey(start);
    const existing = weeklySorted.find((w) => w.period === key);
    weeks.push(
      existing || {
        period: key,
        label: `Week of ${key}`,
        volume: 0,
        transactions: 0,
        records: 0,
      }
    );
  }
  return weeks;
};

const wowDelta = (last4) => {
  if (last4.length < 2) return { volumePct: 0, transactionsPct: 0 };
  const prev = last4[last4.length - 2];
  const curr = last4[last4.length - 1];
  const volumePct = prev.volume
    ? ((curr.volume - prev.volume) / prev.volume) * 100
    : curr.volume
      ? 100
      : 0;
  const transactionsPct = prev.transactions
    ? ((curr.transactions - prev.transactions) / prev.transactions) * 100
    : curr.transactions
      ? 100
      : 0;
  return {
    volumePct: Math.round(volumePct * 10) / 10,
    transactionsPct: Math.round(transactionsPct * 10) / 10,
  };
};

const seedNetworks = () => {
  const map = {};
  SMIPAY_NETWORK_VALUES.forEach((network) => {
    map[network] = { network, ...emptyMetric(), customers: new Set() };
  });
  return map;
};

const networkRows = (map) =>
  Object.values(map)
    .filter((r) => r.records > 0)
    .sort((a, b) => b.volume - a.volume)
    .map((r) => ({
      network: r.network,
      volume: r.volume,
      transactions: r.transactions,
      records: r.records,
      uniqueCustomers: r.customers.size,
    }));

const seedAmountBuckets = () => {
  const map = {};
  AMOUNT_BUCKET_VALUES.forEach((bucket) => {
    map[bucket] = {
      bucket,
      label: AMOUNT_BUCKET_LABELS[bucket],
      ...emptyMetric(),
    };
  });
  return map;
};

const seedTimeOfDay = () => {
  const map = {};
  TIME_OF_DAY_VALUES.forEach((slot) => {
    map[slot] = {
      timeOfDay: slot,
      label: TIME_OF_DAY_LABELS[slot],
      ...emptyMetric(),
    };
  });
  return map;
};

const buildCategorySection = (records, category, rangeTo, now) => {
  const filtered = records.filter((r) => r.category === category);
  const series = buildSeriesMaps();
  const byAmountRange = seedAmountBuckets();
  const byTimeOfDay = seedTimeOfDay();
  const byChannel = {};
  const byDataPlan = {};

  const networkWindows = {
    h24: seedNetworks(),
    week: seedNetworks(),
    month: seedNetworks(),
  };
  const networkBuyers = {
    h24: new Set(),
    week: new Set(),
    month: new Set(),
  };

  const h24From = new Date(now.getTime() - MS_DAY);
  const weekFrom = new Date(now.getTime() - 7 * MS_DAY);
  const monthFrom = new Date(now.getTime() - 30 * MS_DAY);

  const trackNetwork = (windowKey, r, vol, txn) => {
    const bucket = networkWindows[windowKey][r.network];
    if (!bucket) return;
    addMetric(bucket, vol, txn);
    if (r.customer) {
      const id = String(r.customer);
      bucket.customers.add(id);
      networkBuyers[windowKey].add(id);
    }
  };

  let volume = 0;
  let transactions = 0;

  filtered.forEach((r) => {
    const vol = r.totalAmount || 0;
    const txn = r.transactionCount || 0;
    volume += vol;
    transactions += txn;

    bumpSeries(series, r.date, vol, txn);

    const { timeOfDay, amountBucket } = ensureBuckets(r);
    if (byAmountRange[amountBucket]) {
      addMetric(byAmountRange[amountBucket], vol, txn);
    }
    if (byTimeOfDay[timeOfDay]) {
      addMetric(byTimeOfDay[timeOfDay], vol, txn);
    }

    const channel = r.channel || 'other';
    if (!byChannel[channel]) {
      byChannel[channel] = { channel, ...emptyMetric() };
    }
    addMetric(byChannel[channel], vol, txn);

    if (category === 'data') {
      const plan =
        r.dataPlanLabel ||
        (r.dataSizeGb != null
          ? `${r.dataSizeGb}GB`
          : r.dataPlanDuration || 'unknown');
      if (!byDataPlan[plan]) {
        byDataPlan[plan] = { plan, ...emptyMetric() };
      }
      addMetric(byDataPlan[plan], vol, txn);
    }

    if ((category === 'airtime' || category === 'data') && r.network) {
      const d = new Date(r.date);
      if (d >= h24From) trackNetwork('h24', r, vol, txn);
      if (d >= weekFrom) trackNetwork('week', r, vol, txn);
      if (d >= monthFrom) trackNetwork('month', r, vol, txn);
    }
  });

  const weekly = sortByPeriod(series.weekly);
  const last4Weeks = last4WeeksSeries(weekly, rangeTo);
  const change = wowDelta(last4Weeks);

  const section = {
    category,
    summary: {
      volume,
      transactions,
      records: filtered.length,
      averageTicket: transactions ? volume / transactions : 0,
      wowVolumePct: change.volumePct,
      wowTransactionsPct: change.transactionsPct,
    },
    last4Weeks,
    daily: sortByPeriod(series.daily),
    weekly,
    monthly: sortByPeriod(series.monthly),
    byAmountRange: AMOUNT_BUCKET_VALUES.map((b) => byAmountRange[b]),
    byTimeOfDay: TIME_OF_DAY_VALUES.map((t) => byTimeOfDay[t]),
    byChannel: Object.values(byChannel).sort((a, b) => b.volume - a.volume),
  };

  if (category === 'airtime' || category === 'data') {
    section.byNetwork = {
      h24: networkRows(networkWindows.h24),
      week: networkRows(networkWindows.week),
      month: networkRows(networkWindows.month),
      buyers: {
        h24: networkBuyers.h24.size,
        week: networkBuyers.week.size,
        month: networkBuyers.month.size,
      },
    };
  }

  if (category === 'data') {
    section.byDataPlan = Object.values(byDataPlan)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 12);
  }

  return section;
};

const buildGrowthSeries = (dates) => {
  const series = buildSeriesMaps();
  dates.forEach((d) => {
    if (!d) return;
    bumpSeries(series, d, 0, 1);
  });
  // remap: for growth, "transactions" means count of users
  const remap = (rows) =>
    rows.map((r) => ({
      period: r.period,
      label: r.label,
      count: r.transactions,
      records: r.records,
    }));

  return {
    daily: remap(sortByPeriod(series.daily)),
    weekly: remap(sortByPeriod(series.weekly)),
    monthly: remap(sortByPeriod(series.monthly)),
  };
};

const buildUsersAdded = (customers) => {
  const dates = customers.map((c) => c.joinedAt).filter(Boolean);
  const series = buildGrowthSeries(dates);
  return {
    summary: {
      total: customers.length,
      withFirstTxn: customers.filter((c) => c.firstTransactionAt).length,
    },
    ...series,
  };
};

const buildUsersActivated = (activatedInRange, joinedInRangeCount) => {
  const dates = activatedInRange.map((c) => c.firstTransactionAt);
  const series = buildGrowthSeries(dates);
  return {
    summary: {
      total: activatedInRange.length,
      joinedInRange: joinedInRangeCount,
      ratePct: joinedInRangeCount
        ? Math.round((activatedInRange.length / joinedInRangeCount) * 1000) / 10
        : 0,
    },
    ...series,
  };
};

const buildActivationRate = (customers, rangeFrom, rangeTo) => {
  const joinedInRange = customers.filter((c) => {
    if (!c.joinedAt) return false;
    const j = new Date(c.joinedAt);
    return j >= rangeFrom && j <= rangeTo;
  });

  let activatedWithin7d = 0;
  let activatedEver = 0;
  const byWeek = {};

  joinedInRange.forEach((c) => {
    const week = toWeekKey(c.joinedAt);
    if (!byWeek[week]) {
      byWeek[week] = {
        period: week,
        label: `Week of ${week}`,
        joined: 0,
        activatedWithin7d: 0,
        activatedEver: 0,
        ratePct: 0,
      };
    }
    byWeek[week].joined += 1;

    if (c.firstTransactionAt) {
      activatedEver += 1;
      byWeek[week].activatedEver += 1;
      const days =
        (new Date(c.firstTransactionAt) - new Date(c.joinedAt)) / MS_DAY;
      if (days >= 0 && days <= 7) {
        activatedWithin7d += 1;
        byWeek[week].activatedWithin7d += 1;
      }
    }
  });

  Object.values(byWeek).forEach((row) => {
    row.ratePct = row.joined
      ? Math.round((row.activatedWithin7d / row.joined) * 1000) / 10
      : 0;
  });

  const total = joinedInRange.length;
  return {
    summary: {
      joined: total,
      activatedWithin7d,
      activatedEver,
      rateWithin7dPct: total
        ? Math.round((activatedWithin7d / total) * 1000) / 10
        : 0,
      rateEverPct: total
        ? Math.round((activatedEver / total) * 1000) / 10
        : 0,
    },
    byJoinWeek: Object.values(byWeek).sort((a, b) =>
      a.period.localeCompare(b.period)
    ),
  };
};

const buildRetentionRate = (customers, records, rangeFrom, rangeTo) => {
  const joinedInRange = customers.filter((c) => {
    if (!c.joinedAt) return false;
    const j = new Date(c.joinedAt);
    return j >= rangeFrom && j <= rangeTo;
  });

  const txnsByCustomer = {};
  records.forEach((r) => {
    const id = String(r.customer);
    if (!txnsByCustomer[id]) txnsByCustomer[id] = [];
    txnsByCustomer[id].push(new Date(r.date));
  });

  const cohorts = {};
  let d7Hit = 0;
  let d30Hit = 0;
  let eligibleD7 = 0;
  let eligibleD30 = 0;
  const now = new Date();

  joinedInRange.forEach((c) => {
    const join = startOfDay(c.joinedAt);
    const week = toWeekKey(join);
    if (!cohorts[week]) {
      cohorts[week] = {
        period: week,
        label: `Week of ${week}`,
        size: 0,
        w1: 0,
        w2: 0,
        w3: 0,
        w4: 0,
      };
    }
    cohorts[week].size += 1;

    const dates = txnsByCustomer[String(c._id)] || [];
    const hasInWeekOffset = (offset) => {
      const from = new Date(join.getTime() + offset * MS_WEEK);
      const to = new Date(from.getTime() + MS_WEEK);
      return dates.some((d) => d >= from && d < to);
    };

    if (hasInWeekOffset(1)) cohorts[week].w1 += 1;
    if (hasInWeekOffset(2)) cohorts[week].w2 += 1;
    if (hasInWeekOffset(3)) cohorts[week].w3 += 1;
    if (hasInWeekOffset(4)) cohorts[week].w4 += 1;

    const ageDays = (now - join) / MS_DAY;
    if (ageDays >= 7) {
      eligibleD7 += 1;
      const d7End = new Date(join.getTime() + 7 * MS_DAY);
      if (dates.some((d) => d > join && d <= d7End)) d7Hit += 1;
    }
    if (ageDays >= 30) {
      eligibleD30 += 1;
      const d30End = new Date(join.getTime() + 30 * MS_DAY);
      if (dates.some((d) => d > join && d <= d30End)) d30Hit += 1;
    }
  });

  const cohortRows = Object.values(cohorts)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((row) => ({
      ...row,
      w1Pct: row.size ? Math.round((row.w1 / row.size) * 1000) / 10 : 0,
      w2Pct: row.size ? Math.round((row.w2 / row.size) * 1000) / 10 : 0,
      w3Pct: row.size ? Math.round((row.w3 / row.size) * 1000) / 10 : 0,
      w4Pct: row.size ? Math.round((row.w4 / row.size) * 1000) / 10 : 0,
    }));

  return {
    summary: {
      cohorts: cohortRows.length,
      customers: joinedInRange.length,
      d7RetentionPct: eligibleD7
        ? Math.round((d7Hit / eligibleD7) * 1000) / 10
        : 0,
      d30RetentionPct: eligibleD30
        ? Math.round((d30Hit / eligibleD30) * 1000) / 10
        : 0,
      eligibleD7,
      eligibleD30,
    },
    cohorts: cohortRows,
  };
};

const buildDeepAnalytics = async ({ from, to } = {}) => {
  const range = resolveRange(from, to);
  const now = new Date();

  const [records, customers] = await Promise.all([
    SmipayRecord.find({
      date: { $gte: range.from, $lte: range.to },
    }).lean(),
    SmipayCustomer.find().lean(),
  ]);

  // For retention/activation we need customers who joined in range,
  // and all their txns (may extend outside filter for cohort weeks).
  const joinedIds = customers
    .filter((c) => {
      if (!c.joinedAt) return false;
      const j = new Date(c.joinedAt);
      return j >= range.from && j <= range.to;
    })
    .map((c) => c._id);

  const customerIdsAll = customers.map((c) => c._id);
  const [retentionRecords, historyRecords] = await Promise.all([
    joinedIds.length > 0
      ? SmipayRecord.find({ customer: { $in: joinedIds } })
          .select('customer date category totalAmount transactionCount')
          .lean()
      : Promise.resolve([]),
    customerIdsAll.length > 0
      ? SmipayRecord.find({ customer: { $in: customerIdsAll } }).lean()
      : Promise.resolve([]),
  ]);

  const byCategoryMap = {};
  let totalVolume = 0;
  let totalTransactions = 0;
  const customerIds = new Set();

  records.forEach((r) => {
    totalVolume += r.totalAmount || 0;
    totalTransactions += r.transactionCount || 0;
    if (r.customer) customerIds.add(String(r.customer));
    const cat = r.category || 'other';
    if (!byCategoryMap[cat]) byCategoryMap[cat] = emptyMetric();
    addMetric(byCategoryMap[cat], r.totalAmount, r.transactionCount);
  });

  const deposit = buildCategorySection(records, 'deposit', range.to, now);
  const airtime = buildCategorySection(records, 'airtime', range.to, now);
  const data = buildCategorySection(records, 'data', range.to, now);

  const customersInJoinRange = customers.filter((c) => {
    if (!c.joinedAt) return false;
    const j = new Date(c.joinedAt);
    return j >= range.from && j <= range.to;
  });

  // Users activated: those whose firstTransactionAt falls in range
  const activatedInRange = customers.filter((c) => {
    if (!c.firstTransactionAt) return false;
    const a = new Date(c.firstTransactionAt);
    return a >= range.from && a <= range.to;
  });

  const growth = buildGrowthAnalytics({
    rangeRecords: records,
    allRecords: historyRecords.length ? historyRecords : records,
    customers,
    rangeFrom: range.from,
    rangeTo: range.to,
    airtimeSection: airtime,
  });

  return {
    company: 'smipay',
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    overview: {
      totalVolume,
      totalTransactions,
      recordCount: records.length,
      activeCustomers: customerIds.size,
      customerCount: customers.length,
      averageTicket: totalTransactions ? totalVolume / totalTransactions : 0,
      depositVolume: byCategoryMap.deposit?.volume || 0,
      airtimeVolume: byCategoryMap.airtime?.volume || 0,
      dataVolume: byCategoryMap.data?.volume || 0,
      electricityVolume: byCategoryMap.electricity?.volume || 0,
      examBodyVolume: byCategoryMap.exam_body?.volume || 0,
      usersAdded: customersInJoinRange.length,
      usersActivated: activatedInRange.length,
      depositSpend7dPct: growth.northStars.depositSpend7dPct,
      secondTxnRatePct: growth.northStars.secondTxnRatePct,
      pendingRatePct: growth.northStars.pendingRatePct,
      top10SharePct: growth.northStars.top10SharePct,
    },
    sections: {
      deposit,
      airtime,
      data,
      usersAdded: buildUsersAdded(customersInJoinRange),
      usersActivated: buildUsersActivated(
        activatedInRange,
        customersInJoinRange.length
      ),
      activationRate: buildActivationRate(customers, range.from, range.to),
      retentionRate: buildRetentionRate(
        customers,
        retentionRecords,
        range.from,
        range.to
      ),
      growth,
    },
  };
};

module.exports = {
  buildDeepAnalytics,
  resolveRange,
};
