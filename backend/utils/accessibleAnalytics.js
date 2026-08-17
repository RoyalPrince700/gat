const AccessibleDailyTotal = require('../models/AccessibleDailyTotal');
const {
  ACCESSIBLE_CATEGORIES,
  ACCESSIBLE_LEVELS,
} = require('./accessibleMeta');

/**
 * Lightweight Accessible Publishers overview aggregates (daily totals).
 * Revenue = totalCredit sum; expenses = totalDebit sum.
 */
const buildAccessibleGrowth = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [dayCount, recentDays, totalsAgg, categoryRows] = await Promise.all([
    AccessibleDailyTotal.countDocuments(),
    AccessibleDailyTotal.find()
      .sort({ date: -1 })
      .limit(8)
      .select('date totalCredit totalDebit netTotal notes')
      .lean(),
    AccessibleDailyTotal.aggregate([
      {
        $group: {
          _id: null,
          totalCredit: { $sum: '$totalCredit' },
          totalDebit: { $sum: '$totalDebit' },
          netTotal: { $sum: '$netTotal' },
        },
      },
    ]),
    AccessibleDailyTotal.find()
      .select('categories levels totalCredit totalDebit date')
      .lean(),
  ]);

  const totalCredit = totalsAgg[0]?.totalCredit || 0;
  const totalDebit = totalsAgg[0]?.totalDebit || 0;
  const netTotal = totalsAgg[0]?.netTotal ?? totalCredit - totalDebit;

  const categoryMap = {};
  ACCESSIBLE_CATEGORIES.forEach((c) => {
    categoryMap[c.value] = {
      category: c.value,
      label: c.label,
      volume: 0,
      count: 0,
    };
  });

  const levelMap = {};
  ACCESSIBLE_LEVELS.forEach((l) => {
    levelMap[l.value] = {
      level: l.value,
      label: l.label,
      volume: 0,
    };
  });

  let days30d = 0;
  categoryRows.forEach((row) => {
    if (row.date && new Date(row.date) >= thirtyDaysAgo) days30d += 1;
    ACCESSIBLE_CATEGORIES.forEach(({ value }) => {
      const entry = row.categories?.[value];
      if (entry) {
        categoryMap[value].volume += entry.volume || 0;
        categoryMap[value].count += entry.count || 0;
      }
    });
    ACCESSIBLE_LEVELS.forEach(({ value }) => {
      const entry = row.levels?.[value];
      if (entry) {
        levelMap[value].volume += entry.volume || 0;
      }
    });
  });

  return {
    dayCount,
    days30d,
    totalCredit,
    totalDebit,
    netTotal,
    byCategory: Object.values(categoryMap).filter(
      (row) => row.volume > 0 || row.count > 0
    ),
    byLevel: Object.values(levelMap).filter((row) => row.volume > 0),
    recentActivity: recentDays,
  };
};

module.exports = { buildAccessibleGrowth };
