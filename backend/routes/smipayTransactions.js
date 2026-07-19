const express = require('express');
const SmipayRecord = require('../models/SmipayRecord');
const { protect, adminOnly } = require('../middleware/auth');
const { SMIPAY_CATEGORY_VALUES } = require('../utils/smipayCategories');
const {
  SMIPAY_NETWORK_VALUES,
  SMIPAY_STATUS_VALUES,
} = require('../utils/smipayNetworks');

const router = express.Router();

const CHANNELS = ['app', 'web', 'agent', 'ussd', 'other'];

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

const resolveWindowRange = (window, from, to, dateField) => {
  const now = new Date();
  const field = dateField === 'date' ? 'date' : 'createdAt';

  switch (window) {
    case '5h':
      return { field, from: new Date(now.getTime() - 5 * 60 * 60 * 1000), to: now };
    case '12h':
      return { field, from: new Date(now.getTime() - 12 * 60 * 60 * 1000), to: now };
    case '24h':
      return { field, from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to: now };
    case '7d':
      return { field, from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
    case '30d':
      return { field, from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: now };
    case 'today':
      return { field, from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { field, from: startOfDay(y), to: endOfDay(y) };
    }
    case 'week':
      return { field, from: startOfWeek(now), to: endOfDay(now) };
    case 'month':
      return { field, from: startOfMonth(now), to: endOfDay(now) };
    case 'custom': {
      if (!from && !to) return null;
      const range = { field };
      if (from) range.from = new Date(from);
      if (to) {
        // Date-only strings (YYYY-MM-DD) include the full day
        const raw = String(to);
        range.to =
          /^\d{4}-\d{2}-\d{2}$/.test(raw) ? endOfDay(new Date(to)) : new Date(to);
      }
      return range;
    }
    case 'all':
    default:
      return null;
  }
};

const parseCategories = (raw) => {
  if (!raw) return [];
  const list = String(raw)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  return list.filter((c) => SMIPAY_CATEGORY_VALUES.includes(c));
};

const buildBaseFilter = (query) => {
  const filter = {};
  const categories = parseCategories(query.category);
  if (categories.length === 1) filter.category = categories[0];
  else if (categories.length > 1) filter.category = { $in: categories };

  if (query.channel && CHANNELS.includes(query.channel)) {
    filter.channel = query.channel;
  }

  if (query.network && SMIPAY_NETWORK_VALUES.includes(query.network)) {
    filter.network = query.network;
  }

  if (query.status && SMIPAY_STATUS_VALUES.includes(query.status)) {
    filter.status = query.status;
  }

  const amountMin = query.amountMin !== undefined && query.amountMin !== ''
    ? Number(query.amountMin)
    : null;
  const amountMax = query.amountMax !== undefined && query.amountMax !== ''
    ? Number(query.amountMax)
    : null;
  if (
    (amountMin != null && !Number.isNaN(amountMin)) ||
    (amountMax != null && !Number.isNaN(amountMax))
  ) {
    filter.totalAmount = {};
    if (amountMin != null && !Number.isNaN(amountMin)) {
      filter.totalAmount.$gte = amountMin;
    }
    if (amountMax != null && !Number.isNaN(amountMax)) {
      filter.totalAmount.$lte = amountMax;
    }
  }

  const txnMin =
    query.txnMin !== undefined && query.txnMin !== '' ? Number(query.txnMin) : null;
  const txnMax =
    query.txnMax !== undefined && query.txnMax !== '' ? Number(query.txnMax) : null;
  if (
    (txnMin != null && !Number.isNaN(txnMin)) ||
    (txnMax != null && !Number.isNaN(txnMax))
  ) {
    filter.transactionCount = {};
    if (txnMin != null && !Number.isNaN(txnMin)) {
      filter.transactionCount.$gte = txnMin;
    }
    if (txnMax != null && !Number.isNaN(txnMax)) {
      filter.transactionCount.$lte = txnMax;
    }
  }

  if (query.customer) {
    filter.customer = query.customer;
  }

  if (query.createdBy) {
    filter.createdBy = query.createdBy;
  }

  const search = String(query.search || '').trim();
  if (search) {
    filter.customerName = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  return filter;
};

const applyRange = (filter, range) => {
  if (!range) return filter;
  const next = { ...filter };
  const clause = {};
  if (range.from) clause.$gte = range.from;
  if (range.to) clause.$lte = range.to;
  if (Object.keys(clause).length) {
    next[range.field] = clause;
  }
  return next;
};

const summarize = (records) => {
  let totalVolume = 0;
  let totalTransactions = 0;
  let pendingCount = 0;
  let resolvedCount = 0;
  let successfulCount = 0;
  let pendingVolume = 0;
  let resolvedVolume = 0;
  let successfulVolume = 0;
  const customers = new Set();
  const byCategoryMap = {};
  const byChannelMap = {};
  const byNetworkMap = {};
  const byDataPlanMap = {};
  const byDateMap = {};

  const customerKey = (r) =>
    r.customer ? String(r.customer) : r.customerName || null;

  const touchCustomers = (bucket, r) => {
    if (!bucket.customerIds) bucket.customerIds = new Set();
    const key = customerKey(r);
    if (key) bucket.customerIds.add(key);
  };

  const withCustomerCount = (row) => {
    const { customerIds, ...rest } = row;
    return {
      ...rest,
      customers: customerIds ? customerIds.size : 0,
    };
  };

  SMIPAY_CATEGORY_VALUES.forEach((cat) => {
    byCategoryMap[cat] = {
      category: cat,
      volume: 0,
      transactions: 0,
      records: 0,
      customerIds: new Set(),
    };
  });

  SMIPAY_NETWORK_VALUES.forEach((net) => {
    byNetworkMap[net] = {
      network: net,
      volume: 0,
      transactions: 0,
      records: 0,
      customerIds: new Set(),
    };
  });

  records.forEach((r) => {
    totalVolume += r.totalAmount || 0;
    totalTransactions += r.transactionCount || 0;
    const status = r.status || 'successful';
    if (status === 'pending') {
      pendingCount += 1;
      pendingVolume += r.totalAmount || 0;
    } else if (status === 'resolved') {
      resolvedCount += 1;
      resolvedVolume += r.totalAmount || 0;
    } else {
      successfulCount += 1;
      successfulVolume += r.totalAmount || 0;
    }
    const cKey = customerKey(r);
    if (cKey) customers.add(cKey);

    const cat = r.category || 'other';
    if (!byCategoryMap[cat]) {
      byCategoryMap[cat] = {
        category: cat,
        volume: 0,
        transactions: 0,
        records: 0,
        customerIds: new Set(),
      };
    }
    byCategoryMap[cat].volume += r.totalAmount || 0;
    byCategoryMap[cat].transactions += r.transactionCount || 0;
    byCategoryMap[cat].records += 1;
    touchCustomers(byCategoryMap[cat], r);

    const channel = r.channel || 'other';
    if (!byChannelMap[channel]) {
      byChannelMap[channel] = {
        channel,
        volume: 0,
        transactions: 0,
        records: 0,
        customerIds: new Set(),
      };
    }
    byChannelMap[channel].volume += r.totalAmount || 0;
    byChannelMap[channel].transactions += r.transactionCount || 0;
    byChannelMap[channel].records += 1;
    touchCustomers(byChannelMap[channel], r);

    if (r.network) {
      if (!byNetworkMap[r.network]) {
        byNetworkMap[r.network] = {
          network: r.network,
          volume: 0,
          transactions: 0,
          records: 0,
          customerIds: new Set(),
        };
      }
      byNetworkMap[r.network].volume += r.totalAmount || 0;
      byNetworkMap[r.network].transactions += r.transactionCount || 0;
      byNetworkMap[r.network].records += 1;
      touchCustomers(byNetworkMap[r.network], r);
    }

    if (r.category === 'data' && (r.dataPlanLabel || r.dataSizeGb != null)) {
      const planKey = r.dataPlanLabel || String(r.dataSizeGb);
      if (!byDataPlanMap[planKey]) {
        byDataPlanMap[planKey] = {
          plan: planKey,
          dataSizeGb: r.dataSizeGb,
          volume: 0,
          transactions: 0,
          records: 0,
          customerIds: new Set(),
        };
      }
      byDataPlanMap[planKey].volume += r.totalAmount || 0;
      byDataPlanMap[planKey].transactions += r.transactionCount || 0;
      byDataPlanMap[planKey].records += 1;
      touchCustomers(byDataPlanMap[planKey], r);
    }

    const key = new Date(r.date).toISOString().slice(0, 10);
    if (!byDateMap[key]) {
      byDateMap[key] = { date: key, volume: 0, transactions: 0, records: 0 };
    }
    byDateMap[key].volume += r.totalAmount || 0;
    byDateMap[key].transactions += r.transactionCount || 0;
    byDateMap[key].records += 1;
  });

  const byCategory = Object.values(byCategoryMap)
    .map((row) => ({
      ...withCustomerCount(row),
      share: totalVolume ? (row.volume / totalVolume) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  return {
    summary: {
      totalVolume,
      totalTransactions,
      recordCount: records.length,
      uniqueCustomers: customers.size,
      averageTicket: totalTransactions ? totalVolume / totalTransactions : 0,
      pendingCount,
      resolvedCount,
      successfulCount,
      pendingVolume,
      resolvedVolume,
      successfulVolume,
      airtimeVolume: byCategoryMap.airtime?.volume || 0,
      dataVolume: byCategoryMap.data?.volume || 0,
      depositVolume: byCategoryMap.deposit?.volume || 0,
      electricityVolume: byCategoryMap.electricity?.volume || 0,
      examBodyVolume: byCategoryMap.exam_body?.volume || 0,
      cableTvVolume: byCategoryMap.cable_tv?.volume || 0,
      transferVolume: byCategoryMap.transfer?.volume || 0,
      otherVolume: byCategoryMap.other?.volume || 0,
    },
    byCategory: byCategory.filter((row) => row.category !== 'betting'),
    byChannel: Object.values(byChannelMap)
      .map(withCustomerCount)
      .sort((a, b) => b.volume - a.volume),
    byNetwork: Object.values(byNetworkMap)
      .filter((row) => row.records > 0)
      .map(withCustomerCount)
      .sort((a, b) => b.volume - a.volume),
    byDataPlan: Object.values(byDataPlanMap)
      .map(withCustomerCount)
      .sort((a, b) => b.volume - a.volume),
    trend: Object.values(byDateMap).sort((a, b) => a.date.localeCompare(b.date)),
  };
};

const WINDOW_KEYS = ['5h', '12h', '24h', '7d', '30d', 'today'];

const sortRecords = (records, sortBy) => {
  const list = [...records];
  const sorters = {
    date_desc: (a, b) => new Date(b.date) - new Date(a.date),
    date_asc: (a, b) => new Date(a.date) - new Date(b.date),
    logged_desc: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    logged_asc: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    amount_desc: (a, b) => b.totalAmount - a.totalAmount,
    amount_asc: (a, b) => a.totalAmount - b.totalAmount,
    txn_desc: (a, b) => b.transactionCount - a.transactionCount,
    txn_asc: (a, b) => a.transactionCount - b.transactionCount,
    customer_asc: (a, b) => (a.customerName || '').localeCompare(b.customerName || ''),
    customer_desc: (a, b) => (b.customerName || '').localeCompare(a.customerName || ''),
  };
  list.sort(sorters[sortBy] || sorters.logged_desc);
  return list;
};

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const window = req.query.window || '30d';
    const dateField = req.query.dateField === 'date' ? 'date' : 'createdAt';
    const baseFilter = buildBaseFilter(req.query);
    const range = resolveWindowRange(window, req.query.from, req.query.to, dateField);
    const filter = applyRange(baseFilter, range);

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50));
    const sortBy = req.query.sortBy || 'logged_desc';

    const [records, windowSource] = await Promise.all([
      SmipayRecord.find(filter)
        .populate('createdBy', 'name email')
        .populate('customer', 'name phone email')
        .lean(),
      SmipayRecord.find(baseFilter).select(
        'totalAmount transactionCount category channel date createdAt customer customerName'
      ).lean(),
    ]);

    const analysis = summarize(records);
    const windows = {};
    WINDOW_KEYS.forEach((key) => {
      const winRange = resolveWindowRange(key, null, null, dateField);
      const subset = windowSource.filter((r) => {
        if (!winRange) return true;
        const value = new Date(r[winRange.field]);
        if (winRange.from && value < winRange.from) return false;
        if (winRange.to && value > winRange.to) return false;
        return true;
      });
      const stats = summarize(subset).summary;
      windows[key] = {
        volume: stats.totalVolume,
        transactions: stats.totalTransactions,
        records: stats.recordCount,
        uniqueCustomers: stats.uniqueCustomers,
        averageTicket: stats.averageTicket,
      };
    });

    const sorted = sortRecords(records, sortBy);
    const total = sorted.length;
    const start = (page - 1) * limit;
    const pageRecords = sorted.slice(start, start + limit);

    res.json({
      summary: analysis.summary,
      byCategory: analysis.byCategory,
      byChannel: analysis.byChannel,
      byNetwork: analysis.byNetwork,
      byDataPlan: analysis.byDataPlan,
      trend: analysis.trend,
      windows,
      records: pageRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
      applied: {
        window,
        dateField: range?.field || dateField,
        from: range?.from || null,
        to: range?.to || null,
        categories: parseCategories(req.query.category),
        channel: req.query.channel || 'all',
        network: req.query.network || 'all',
        status: req.query.status || 'all',
        search: String(req.query.search || '').trim(),
        sortBy,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
