const TrifoneCustomer = require('../models/TrifoneCustomer');
const TrifoneSale = require('../models/TrifoneSale');
const { PRODUCT_CATEGORIES, SALE_CHANNELS } = require('./trifoneMeta');

/**
 * Lightweight Trifone overview aggregates (Phase 1).
 */
const buildTrifoneGrowth = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [customerCount, newCustomers30d, sales, recentSales] = await Promise.all([
    TrifoneCustomer.countDocuments(),
    TrifoneCustomer.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    }),
    TrifoneSale.find()
      .select(
        'status productCategory channel totalAmount quantity title customerName date'
      )
      .lean(),
    TrifoneSale.find()
      .sort({ date: -1 })
      .limit(8)
      .select(
        'title customerName productCategory status totalAmount quantity channel date'
      )
      .lean(),
  ]);

  let totalRevenue = 0;
  let confirmedSales = 0;
  let deliveredSales = 0;
  const categoryMap = {};
  const channelMap = {};

  PRODUCT_CATEGORIES.forEach((cat) => {
    categoryMap[cat.value] = {
      productCategory: cat.value,
      label: cat.label,
      count: 0,
      revenue: 0,
      quantity: 0,
    };
  });

  SALE_CHANNELS.forEach((ch) => {
    channelMap[ch.value] = {
      channel: ch.value,
      label: ch.label,
      count: 0,
      revenue: 0,
    };
  });

  sales.forEach((s) => {
    if (s.status === 'cancelled') return;

    totalRevenue += s.totalAmount || 0;
    if (s.status === 'confirmed') confirmedSales += 1;
    if (s.status === 'delivered') deliveredSales += 1;

    const catKey = s.productCategory || 'other';
    if (!categoryMap[catKey]) {
      categoryMap[catKey] = {
        productCategory: catKey,
        label: catKey,
        count: 0,
        revenue: 0,
        quantity: 0,
      };
    }
    categoryMap[catKey].count += 1;
    categoryMap[catKey].revenue += s.totalAmount || 0;
    categoryMap[catKey].quantity += s.quantity || 0;

    const chKey = s.channel || 'other';
    if (!channelMap[chKey]) {
      channelMap[chKey] = {
        channel: chKey,
        label: chKey,
        count: 0,
        revenue: 0,
      };
    }
    channelMap[chKey].count += 1;
    channelMap[chKey].revenue += s.totalAmount || 0;
  });

  const byProductCategory = Object.values(categoryMap).filter(
    (row) => row.count > 0 || row.revenue > 0
  );
  const byChannel = Object.values(channelMap).filter(
    (row) => row.count > 0 || row.revenue > 0
  );

  return {
    customerCount,
    newCustomers30d,
    saleCount: sales.length,
    confirmedSales,
    deliveredSales,
    totalRevenue,
    byProductCategory,
    byChannel,
    recentActivity: recentSales,
  };
};

module.exports = { buildTrifoneGrowth };
