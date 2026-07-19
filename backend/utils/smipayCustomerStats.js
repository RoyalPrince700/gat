const SmipayRecord = require('../models/SmipayRecord');
const SmipayCustomer = require('../models/SmipayCustomer');

const daysBetween = (from, to = Date.now()) => {
  if (!from) return null;
  return Math.max(0, Math.floor((new Date(to) - new Date(from)) / 86400000));
};

const classifyBehavior = ({
  totalTransactions = 0,
  totalVolume = 0,
  lastTransactionAt = null,
}) => {
  if (!totalTransactions) return 'registered_no_txn';

  const daysSinceLastTxn = daysBetween(lastTransactionAt);
  if (daysSinceLastTxn != null && daysSinceLastTxn > 30) return 'dormant';
  if (totalTransactions >= 50 || totalVolume >= 2000000) return 'power_user';
  if (totalTransactions >= 10) return 'active';
  return 'early';
};

const syncCustomerTransactionDates = async (customerId) => {
  const stats = await SmipayRecord.aggregate([
    { $match: { customer: customerId } },
    {
      $group: {
        _id: '$customer',
        firstTransactionAt: { $min: '$date' },
        lastTransactionAt: { $max: '$date' },
        totalVolume: { $sum: '$totalAmount' },
        totalTransactions: { $sum: '$transactionCount' },
      },
    },
  ]);

  if (!stats.length) {
    await SmipayCustomer.findByIdAndUpdate(customerId, {
      firstTransactionAt: null,
      lastTransactionAt: null,
    });
    return null;
  }

  const row = stats[0];
  await SmipayCustomer.findByIdAndUpdate(customerId, {
    firstTransactionAt: row.firstTransactionAt,
    lastTransactionAt: row.lastTransactionAt,
  });
  return row;
};

const buildCustomerAnalysis = async (customer) => {
  const records = await SmipayRecord.find({ customer: customer._id }).sort({
    date: 1,
  });

  const byCategory = {};
  const byChannel = {};
  let totalVolume = 0;
  let totalTransactions = 0;

  records.forEach((r) => {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { category: r.category, volume: 0, transactions: 0 };
    }
    byCategory[r.category].volume += r.totalAmount;
    byCategory[r.category].transactions += r.transactionCount;

    if (!byChannel[r.channel]) {
      byChannel[r.channel] = { channel: r.channel, volume: 0, transactions: 0 };
    }
    byChannel[r.channel].volume += r.totalAmount;
    byChannel[r.channel].transactions += r.transactionCount;

    totalVolume += r.totalAmount;
    totalTransactions += r.transactionCount;
  });

  const firstRecord = records[0] || null;
  const secondRecord =
    records.length >= 2
      ? records[1]
      : firstRecord && (firstRecord.transactionCount || 0) >= 2
        ? firstRecord
        : null;

  const firstTransactionAt =
    customer.firstTransactionAt || firstRecord?.date || null;
  const secondTransactionAt = secondRecord?.date || null;

  const daysSinceJoin = daysBetween(customer.joinedAt);
  const daysToFirstTxn =
    customer.joinedAt && firstTransactionAt
      ? daysBetween(customer.joinedAt, firstTransactionAt)
      : null;
  const daysToSecondTxn =
    firstTransactionAt && secondTransactionAt
      ? daysBetween(firstTransactionAt, secondTransactionAt)
      : null;
  const daysSinceLastTxn = daysBetween(customer.lastTransactionAt);
  const behavior = classifyBehavior({
    totalTransactions,
    totalVolume,
    lastTransactionAt: customer.lastTransactionAt,
  });

  return {
    customer,
    summary: {
      totalVolume,
      totalTransactions,
      recordCount: records.length,
      averageTicket: totalTransactions ? totalVolume / totalTransactions : 0,
      daysSinceJoin,
      daysToFirstTxn,
      daysToSecondTxn,
      daysSinceLastTxn,
      hasSecondTxn: Boolean(secondTransactionAt),
      firstTransactionAt,
      secondTransactionAt,
      behavior,
    },
    byCategory: Object.values(byCategory)
      .filter((row) => row.category !== 'betting')
      .sort((a, b) => b.volume - a.volume),
    byChannel: Object.values(byChannel).sort((a, b) => b.volume - a.volume),
    timeline: records.map((r) => ({
      _id: r._id,
      date: r.date,
      category: r.category,
      channel: r.channel,
      transactionCount: r.transactionCount,
      totalAmount: r.totalAmount,
      notes: r.notes,
    })),
  };
};

module.exports = {
  syncCustomerTransactionDates,
  buildCustomerAnalysis,
  classifyBehavior,
  daysBetween,
};
