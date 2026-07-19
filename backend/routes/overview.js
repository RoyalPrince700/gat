const express = require('express');
const Company = require('../models/Company');
const User = require('../models/User');
const SmipayRecord = require('../models/SmipayRecord');
const SmipayCustomer = require('../models/SmipayCustomer');
const { protect, adminOnly } = require('../middleware/auth');
const { SMIPAY_CATEGORIES } = require('../utils/smipayCategories');
const { buildSmehGrowth } = require('../utils/smehAnalytics');

const router = express.Router();

const buildSmipayGrowth = async () => {
  const [
    customerCount,
    newCustomers30d,
    smipayRecords,
    smipayAgg,
    categoryAgg,
    recentSmipay,
    dormantCount,
  ] = await Promise.all([
    SmipayCustomer.countDocuments(),
    SmipayCustomer.countDocuments({
      joinedAt: { $gte: new Date(Date.now() - 30 * 86400000) },
    }),
    SmipayRecord.countDocuments(),
    SmipayRecord.aggregate([
      {
        $group: {
          _id: null,
          volume: { $sum: '$totalAmount' },
          transactions: { $sum: '$transactionCount' },
        },
      },
    ]),
    SmipayRecord.aggregate([
      {
        $group: {
          _id: '$category',
          volume: { $sum: '$totalAmount' },
          transactions: { $sum: '$transactionCount' },
          records: { $sum: 1 },
        },
      },
      { $sort: { volume: -1 } },
    ]),
    SmipayRecord.find()
      .sort({ date: -1 })
      .limit(8)
      .select('customerName category totalAmount transactionCount date channel'),
    SmipayCustomer.countDocuments({
      lastTransactionAt: { $lt: new Date(Date.now() - 30 * 86400000) },
    }),
  ]);

  const labelMap = Object.fromEntries(
    SMIPAY_CATEGORIES.map((c) => [c.value, c.label])
  );

  const byCategory = categoryAgg.map((row) => ({
    category: row._id,
    label: labelMap[row._id] || row._id,
    volume: row.volume,
    transactions: row.transactions,
    records: row.records,
  }));

  const pick = (key) => byCategory.find((c) => c.category === key)?.volume || 0;

  return {
    customerCount,
    newCustomers30d,
    dormantCustomers: dormantCount,
    smipayRecords,
    smipayVolume: smipayAgg[0]?.volume || 0,
    smipayTransactions: smipayAgg[0]?.transactions || 0,
    averageTicket:
      smipayAgg[0]?.transactions
        ? smipayAgg[0].volume / smipayAgg[0].transactions
        : 0,
    airtimeVolume: pick('airtime'),
    dataVolume: pick('data'),
    depositVolume: pick('deposit'),
    electricityVolume: pick('electricity'),
    examBodyVolume: pick('exam_body'),
    cableTvVolume: pick('cable_tv'),
    transferVolume: pick('transfer'),
    otherVolume: pick('other'),
    byCategory: byCategory.filter((row) => row.category !== 'betting'),
    recentActivity: recentSmipay,
  };
};

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const companySlug = req.query.company || 'all';
    const companies = await Company.find().sort({ name: 1 });

    const selected =
      companySlug === 'all'
        ? null
        : companies.find((c) => c.slug === companySlug);

    if (companySlug !== 'all' && !selected) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const includeSmipay = companySlug === 'all' || companySlug === 'smipay';
    const includeSmeh =
      companySlug === 'all' || companySlug === 'smart-edu-hub';

    const teamUserFilter =
      companySlug === 'all'
        ? { role: 'user' }
        : { role: 'user', company: selected._id };

    const [teamUsers, smipayGrowth, smehGrowth] = await Promise.all([
      User.countDocuments(teamUserFilter),
      includeSmipay ? buildSmipayGrowth() : Promise.resolve(null),
      includeSmeh ? buildSmehGrowth() : Promise.resolve(null),
    ]);

    const visibleCompanies =
      companySlug === 'all' ? companies : selected ? [selected] : [];

    res.json({
      scope: companySlug,
      summary: {
        companyCount: visibleCompanies.length,
        teamUserCount: teamUsers,
        customerCount: smipayGrowth?.customerCount || 0,
        newCustomers30d: smipayGrowth?.newCustomers30d || 0,
        dormantCustomers: smipayGrowth?.dormantCustomers || 0,
        smipayRecords: smipayGrowth?.smipayRecords || 0,
        smipayVolume: smipayGrowth?.smipayVolume || 0,
        smipayTransactions: smipayGrowth?.smipayTransactions || 0,
        averageTicket: smipayGrowth?.averageTicket || 0,
        airtimeVolume: smipayGrowth?.airtimeVolume || 0,
        dataVolume: smipayGrowth?.dataVolume || 0,
        depositVolume: smipayGrowth?.depositVolume || 0,
        electricityVolume: smipayGrowth?.electricityVolume || 0,
        examBodyVolume: smipayGrowth?.examBodyVolume || 0,
        cableTvVolume: smipayGrowth?.cableTvVolume || 0,
        transferVolume: smipayGrowth?.transferVolume || 0,
        otherVolume: smipayGrowth?.otherVolume || 0,
        // SMEH
        smehSchools: smehGrowth?.schoolCount || 0,
        smehSubscribedSchools: smehGrowth?.subscribedSchoolCount || 0,
        smehAwareOnly: smehGrowth?.awareOnlyCount || 0,
        smehActiveSubs: smehGrowth?.activeSubs || 0,
        smehInactiveSubs: smehGrowth?.inactiveSubs || 0,
        smehRevenue: smehGrowth?.subscriptionRevenue || 0,
        smehActiveRevenue: smehGrowth?.activeRevenue || 0,
        smehPlatformInUse: smehGrowth?.platformInUseCount || 0,
        smehStudentOnboarded: smehGrowth?.studentOnboarded || 0,
        smehTeacherOnboarded: smehGrowth?.teacherOnboarded || 0,
        smehParentOnboarded: smehGrowth?.parentOnboarded || 0,
        smehRecords: smehGrowth?.recordCount || 0,
        // legacy aliases for hub cards during transition
        eduRecords: smehGrowth?.recordCount || 0,
        eduFees: smehGrowth?.subscriptionRevenue || 0,
        eduEnrollments: smehGrowth?.subscribedSchoolCount || 0,
      },
      byCategory: smipayGrowth?.byCategory || [],
      smeh: smehGrowth
        ? {
            expiringSoon: smehGrowth.expiringSoon,
            studentOnboardedPct: smehGrowth.studentOnboardedPct,
            teacherOnboardedPct: smehGrowth.teacherOnboardedPct,
            parentOnboardedPct: smehGrowth.parentOnboardedPct,
            platformInUsePct: smehGrowth.platformInUsePct,
          }
        : null,
      companies: visibleCompanies,
      recentActivity: {
        smipay: smipayGrowth?.recentActivity || [],
        smeh: smehGrowth?.recentActivity || [],
        edu: smehGrowth?.recentActivity || [],
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
