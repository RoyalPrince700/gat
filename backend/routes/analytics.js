const express = require('express');
const SmipayRecord = require('../models/SmipayRecord');
const SmipayDailyTotal = require('../models/SmipayDailyTotal');
const Company = require('../models/Company');
const { protect, adminOnly } = require('../middleware/auth');
const { buildDeepAnalytics } = require('../utils/smipayDeepAnalytics');
const { buildSmehGrowth } = require('../utils/smehAnalytics');
const {
  SMIPAY_CATEGORIES,
  SMIPAY_CATEGORY_VALUES,
} = require('../utils/smipayCategories');

const router = express.Router();

const SUMMARY_VOLUME_KEYS = {
  deposit: 'depositVolume',
  airtime: 'airtimeVolume',
  data: 'dataVolume',
  electricity: 'electricityVolume',
  cable_tv: 'cableTvVolume',
  exam_body: 'examBodyVolume',
  transfer: 'transferVolume',
  other: 'otherVolume',
};

const toDayStart = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

router.get('/smipay/deep', protect, adminOnly, async (req, res) => {
  try {
    const data = await buildDeepAnalytics({
      from: req.query.from,
      to: req.query.to,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Admin Total analytics — SmipayDailyTotal only (not merged with SmipayRecord).
 * GET /api/analytics/smipay/daily-totals?from=&to=
 */
router.get('/smipay/daily-totals', protect, adminOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const company = await Company.findOne({ slug: 'smipay' });
    const filter = company ? { company: company._id } : {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toDayStart(from);
      if (to) {
        const end = toDayStart(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const entries = await SmipayDailyTotal.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: 1 });

    const summary = {
      totalVolume: 0,
      totalTransactions: 0,
      dayCount: entries.length,
    };
    SMIPAY_CATEGORY_VALUES.forEach((key) => {
      summary[SUMMARY_VOLUME_KEYS[key]] = 0;
    });

    const byCategoryMap = {};
    SMIPAY_CATEGORY_VALUES.forEach((key) => {
      byCategoryMap[key] = {
        category: key,
        volume: 0,
        count: 0,
      };
    });

    const trend = [];

    entries.forEach((row) => {
      const dateKey = row.date.toISOString().slice(0, 10);
      let dayVolume = 0;
      let dayCount = 0;

      SMIPAY_CATEGORY_VALUES.forEach((key) => {
        const cat = (row.categories && row.categories[key]) || {};
        const volume = Number(cat.volume) || 0;
        const count = Number(cat.count) || 0;
        byCategoryMap[key].volume += volume;
        byCategoryMap[key].count += count;
        summary[SUMMARY_VOLUME_KEYS[key]] += volume;
        dayVolume += volume;
        dayCount += count;
      });

      summary.totalVolume += dayVolume;
      summary.totalTransactions += dayCount;

      trend.push({
        date: dateKey,
        volume: dayVolume,
        count: dayCount,
      });
    });

    res.json({
      company: 'smipay',
      source: 'daily_totals',
      summary,
      byCategory: Object.values(byCategoryMap)
        .filter((row) => row.volume > 0 || row.count > 0)
        .sort((a, b) => b.volume - a.volume),
      categories: SMIPAY_CATEGORIES,
      trend,
      entries,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const dateFilter = (from, to) => {
  if (!from && !to) return {};
  const date = {};
  if (from) date.$gte = new Date(from);
  if (to) date.$lte = new Date(to);
  return { date };
};

router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const filter = dateFilter(req.query.from, req.query.to);
    const [smipayRecords, smehGrowth] = await Promise.all([
      SmipayRecord.find(filter).sort({ date: 1 }),
      buildSmehGrowth({ from: req.query.from, to: req.query.to }),
    ]);

    const buildSmipay = (records) => {
      const byDateMap = {};
      const byCustomerMap = {};
      const byCategoryMap = {};
      let totalVolume = 0;
      let totalTransactions = 0;

      records.forEach((r) => {
        const key = r.date.toISOString().slice(0, 10);
        if (!byDateMap[key]) {
          byDateMap[key] = { date: key, volume: 0, transactions: 0, records: 0 };
        }
        byDateMap[key].volume += r.totalAmount;
        byDateMap[key].transactions += r.transactionCount;
        byDateMap[key].records += 1;

        if (!byCustomerMap[r.customerName]) {
          byCustomerMap[r.customerName] = {
            customerName: r.customerName,
            volume: 0,
            transactions: 0,
          };
        }
        byCustomerMap[r.customerName].volume += r.totalAmount;
        byCustomerMap[r.customerName].transactions += r.transactionCount;

        const cat = r.category || 'other';
        if (!byCategoryMap[cat]) {
          byCategoryMap[cat] = { category: cat, volume: 0, transactions: 0 };
        }
        byCategoryMap[cat].volume += r.totalAmount;
        byCategoryMap[cat].transactions += r.transactionCount;

        totalVolume += r.totalAmount;
        totalTransactions += r.transactionCount;
      });

      return {
        company: 'smipay',
        name: 'Smipay',
        summary: {
          totalVolume,
          totalTransactions,
          recordCount: records.length,
          customerCount: Object.keys(byCustomerMap).length,
          averageTicket: totalTransactions
            ? totalVolume / totalTransactions
            : 0,
          airtimeVolume: byCategoryMap.airtime?.volume || 0,
          dataVolume: byCategoryMap.data?.volume || 0,
          depositVolume: byCategoryMap.deposit?.volume || 0,
          electricityVolume: byCategoryMap.electricity?.volume || 0,
          examBodyVolume: byCategoryMap.exam_body?.volume || 0,
        },
        trend: Object.values(byDateMap),
        topCustomers: Object.values(byCustomerMap)
          .sort((a, b) => b.volume - a.volume)
          .slice(0, 8),
        byCategory: Object.values(byCategoryMap)
          .filter((row) => row.category !== 'betting')
          .sort((a, b) => b.volume - a.volume),
      };
    };

    const edu = {
      company: 'smart-edu-hub',
      name: 'Smart Edu Hub',
      summary: {
        schoolCount: smehGrowth.schoolCount,
        subscribedSchoolCount: smehGrowth.subscribedSchoolCount,
        activeSubs: smehGrowth.activeSubs,
        inactiveSubs: smehGrowth.inactiveSubs,
        subscriptionRevenue: smehGrowth.subscriptionRevenue,
        platformInUseCount: smehGrowth.platformInUseCount,
        studentOnboardedPct: smehGrowth.studentOnboardedPct,
        teacherOnboardedPct: smehGrowth.teacherOnboardedPct,
        parentOnboardedPct: smehGrowth.parentOnboardedPct,
        platformInUsePct: smehGrowth.platformInUsePct,
        recordCount: smehGrowth.recordCount,
        // legacy keys used by older UI bits
        totalFees: smehGrowth.subscriptionRevenue,
        totalEnrollments: smehGrowth.subscribedSchoolCount,
      },
      trend: smehGrowth.trend,
      topSchools: smehGrowth.topSchools,
      expiringSoon: smehGrowth.expiringSoon,
    };

    const smipay = buildSmipay(smipayRecords);

    res.json({
      company: 'all',
      summary: {
        smipayVolume: smipay.summary.totalVolume,
        smipayTransactions: smipay.summary.totalTransactions,
        eduFees: edu.summary.subscriptionRevenue,
        eduEnrollments: edu.summary.subscribedSchoolCount,
        smehRevenue: edu.summary.subscriptionRevenue,
        smehSchools: edu.summary.schoolCount,
        recordCount: smipay.summary.recordCount + edu.summary.recordCount,
      },
      smipay,
      edu,
      smeh: edu,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/smipay', protect, adminOnly, async (req, res) => {
  try {
    const filter = dateFilter(req.query.from, req.query.to);
    const [records, customerCount] = await Promise.all([
      SmipayRecord.find(filter).sort({ date: 1 }),
      require('../models/SmipayCustomer').countDocuments(),
    ]);

    const byDateMap = {};
    const byCustomerMap = {};
    const byCategoryMap = {};
    let totalVolume = 0;
    let totalTransactions = 0;

    records.forEach((r) => {
      const key = r.date.toISOString().slice(0, 10);
      if (!byDateMap[key]) {
        byDateMap[key] = { date: key, volume: 0, transactions: 0, records: 0 };
      }
      byDateMap[key].volume += r.totalAmount;
      byDateMap[key].transactions += r.transactionCount;
      byDateMap[key].records += 1;

      if (!byCustomerMap[r.customerName]) {
        byCustomerMap[r.customerName] = {
          customerName: r.customerName,
          volume: 0,
          transactions: 0,
        };
      }
      byCustomerMap[r.customerName].volume += r.totalAmount;
      byCustomerMap[r.customerName].transactions += r.transactionCount;

      const cat = r.category || 'other';
      if (!byCategoryMap[cat]) {
        byCategoryMap[cat] = { category: cat, volume: 0, transactions: 0 };
      }
      byCategoryMap[cat].volume += r.totalAmount;
      byCategoryMap[cat].transactions += r.transactionCount;

      totalVolume += r.totalAmount;
      totalTransactions += r.transactionCount;
    });

    res.json({
      company: 'smipay',
      summary: {
        totalVolume,
        totalTransactions,
        recordCount: records.length,
        customerCount,
        averageTicket: totalTransactions
          ? totalVolume / totalTransactions
          : 0,
        airtimeVolume: byCategoryMap.airtime?.volume || 0,
        dataVolume: byCategoryMap.data?.volume || 0,
        depositVolume: byCategoryMap.deposit?.volume || 0,
        electricityVolume: byCategoryMap.electricity?.volume || 0,
        examBodyVolume: byCategoryMap.exam_body?.volume || 0,
      },
      trend: Object.values(byDateMap),
      topCustomers: Object.values(byCustomerMap)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 8),
      byCategory: Object.values(byCategoryMap)
        .filter((row) => row.category !== 'betting')
        .sort((a, b) => b.volume - a.volume),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/smart-edu-hub', protect, adminOnly, async (req, res) => {
  try {
    const growth = await buildSmehGrowth({
      from: req.query.from,
      to: req.query.to,
    });

    res.json({
      company: 'smart-edu-hub',
      summary: {
        schoolCount: growth.schoolCount,
        subscribedSchoolCount: growth.subscribedSchoolCount,
        awareOnlyCount: growth.awareOnlyCount,
        activeSubs: growth.activeSubs,
        inactiveSubs: growth.inactiveSubs,
        subscriptionRevenue: growth.subscriptionRevenue,
        activeRevenue: growth.activeRevenue,
        platformInUseCount: growth.platformInUseCount,
        studentOnboarded: growth.studentOnboarded,
        teacherOnboarded: growth.teacherOnboarded,
        parentOnboarded: growth.parentOnboarded,
        studentOnboardedPct: growth.studentOnboardedPct,
        teacherOnboardedPct: growth.teacherOnboardedPct,
        parentOnboardedPct: growth.parentOnboardedPct,
        platformInUsePct: growth.platformInUsePct,
        recordCount: growth.recordCount,
        totalFees: growth.subscriptionRevenue,
        totalEnrollments: growth.subscribedSchoolCount,
      },
      trend: growth.trend,
      topSchools: growth.topSchools,
      expiringSoon: growth.expiringSoon,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
