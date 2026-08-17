const express = require('express');
const Company = require('../models/Company');
const User = require('../models/User');
const SmipayCost = require('../models/SmipayCost');
const SmipayRecord = require('../models/SmipayRecord');
const SmipayCustomer = require('../models/SmipayCustomer');
const { protect, mdOrAdmin } = require('../middleware/auth');
const { SMIPAY_CATEGORIES } = require('../utils/smipayCategories');
const { buildAccessibleGrowth } = require('../utils/accessibleAnalytics');
const { buildSmehGrowth } = require('../utils/smehAnalytics');
const { buildBesttechGrowth } = require('../utils/besttechAnalytics');
const { buildBestInPrintGrowth } = require('../utils/bestinprintAnalytics');
const { buildOxygenGrowth } = require('../utils/oxygenAnalytics');
const { buildTrifoneGrowth } = require('../utils/trifoneAnalytics');

const router = express.Router();

/** Active Smipay cost-module spend (primary tracked expense source today). */
const sumSmipayCostSpend = async () => {
  const [agg] = await SmipayCost.aggregate([
    { $match: { active: true } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return agg?.total || 0;
};

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

router.get('/', protect, mdOrAdmin, async (req, res) => {
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
    const includeBesttech =
      companySlug === 'all' || companySlug === 'best-technology-it';
    const includeBestInPrint =
      companySlug === 'all' || companySlug === 'best-in-print';
    const includeOxygen =
      companySlug === 'all' || companySlug === 'oxygen-fm';
    const includeTrifone =
      companySlug === 'all' || companySlug === 'trifone';
    const includeAccessible =
      companySlug === 'all' || companySlug === 'accessible-publishers';
    // Costs module exists for Smipay today; include when scope has Smipay or portfolio.
    const includeSmipayCosts = includeSmipay;

    const teamUserFilter =
      companySlug === 'all'
        ? { role: 'user' }
        : { role: 'user', company: selected._id };

    const [
      teamUsers,
      smipayGrowth,
      smehGrowth,
      besttechGrowth,
      bestInPrintGrowth,
      oxygenGrowth,
      trifoneGrowth,
      accessibleGrowth,
      smipayCostSpend,
    ] = await Promise.all([
      User.countDocuments(teamUserFilter),
      includeSmipay ? buildSmipayGrowth() : Promise.resolve(null),
      includeSmeh ? buildSmehGrowth() : Promise.resolve(null),
      includeBesttech ? buildBesttechGrowth() : Promise.resolve(null),
      includeBestInPrint ? buildBestInPrintGrowth() : Promise.resolve(null),
      includeOxygen ? buildOxygenGrowth() : Promise.resolve(null),
      includeTrifone ? buildTrifoneGrowth() : Promise.resolve(null),
      includeAccessible ? buildAccessibleGrowth() : Promise.resolve(null),
      includeSmipayCosts ? sumSmipayCostSpend() : Promise.resolve(0),
    ]);

    const visibleCompanies =
      companySlug === 'all' ? companies : selected ? [selected] : [];

    // Portfolio / scoped money-in.
    // Smipay: smipayVolume from SmipayRecord totals only (not a second daily-totals source).
    // BestTech / Print / Oxygen: amountReceived (cash received), not pipeline/contractValue.
    const smipayRevenue = smipayGrowth?.smipayVolume || 0;
    const smehRevenue = smehGrowth?.subscriptionRevenue || 0;
    const besttechReceived = besttechGrowth?.amountReceived || 0;
    const bestInPrintReceived = bestInPrintGrowth?.amountReceived || 0;
    const oxygenReceived = oxygenGrowth?.amountReceived || 0;
    const trifoneRevenue = trifoneGrowth?.totalRevenue || 0;
    const accessibleCredit = accessibleGrowth?.totalCredit || 0;
    const accessibleDebit = accessibleGrowth?.totalDebit || 0;

    const totalRevenue =
      smipayRevenue +
      smehRevenue +
      besttechReceived +
      bestInPrintReceived +
      oxygenReceived +
      trifoneRevenue +
      accessibleCredit;

    // Expenses: Smipay cost module + Accessible totalDebit (others contribute 0 until tracked).
    const totalExpenses = (smipayCostSpend || 0) + accessibleDebit;
    const netPosition = totalRevenue - totalExpenses;

    const activityCount =
      (smipayGrowth?.smipayRecords || 0) +
      (smehGrowth?.recordCount || 0) +
      (besttechGrowth?.projectCount || 0) +
      (bestInPrintGrowth?.jobCount || 0) +
      (oxygenGrowth?.bookingCount || 0) +
      (trifoneGrowth?.saleCount || 0) +
      (accessibleGrowth?.dayCount || 0);

    const revenueByCompany = {
      smipay: smipayRevenue,
      'smart-edu-hub': smehRevenue,
      'best-technology-it': besttechReceived,
      'best-in-print': bestInPrintReceived,
      'oxygen-fm': oxygenReceived,
      trifone: trifoneRevenue,
      'accessible-publishers': accessibleCredit,
    };

    const expenseByCompany = {
      smipay: smipayCostSpend || 0,
      'smart-edu-hub': 0,
      'best-technology-it': 0,
      'best-in-print': 0,
      'oxygen-fm': 0,
      trifone: 0,
      'accessible-publishers': accessibleDebit,
    };

    const activityByCompany = {
      smipay: smipayGrowth?.smipayRecords || 0,
      'smart-edu-hub': smehGrowth?.recordCount || 0,
      'best-technology-it': besttechGrowth?.projectCount || 0,
      'best-in-print': bestInPrintGrowth?.jobCount || 0,
      'oxygen-fm': oxygenGrowth?.bookingCount || 0,
      trifone: trifoneGrowth?.saleCount || 0,
      'accessible-publishers': accessibleGrowth?.dayCount || 0,
    };

    const byCompany = (companySlug === 'all' ? companies : visibleCompanies).map(
      (c) => {
        const revenue = revenueByCompany[c.slug] || 0;
        const expenses = expenseByCompany[c.slug] || 0;
        const net = revenue - expenses;
        return {
          slug: c.slug,
          name: c.name,
          revenue,
          expenses,
          net,
          marginPct: revenue > 0 ? (net / revenue) * 100 : null,
          activityCount: activityByCompany[c.slug] || 0,
        };
      }
    );

    // Rank by net desc, then revenue desc for hub "who's doing well".
    byCompany.sort((a, b) => b.net - a.net || b.revenue - a.revenue);

    res.json({
      scope: companySlug,
      summary: {
        companyCount: visibleCompanies.length,
        teamUserCount: teamUsers,
        // Portfolio-wide (or scoped) money metrics for hub / shared clients
        totalRevenue,
        totalExpenses,
        netPosition,
        activityCount,
        revenueByCompany,
        expenseBySource: {
          smipayCosts: smipayCostSpend || 0,
          accessibleDebit,
        },
        byCompany,
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
        // Best Technology IT
        besttechClients: besttechGrowth?.clientCount || 0,
        besttechNewClients30d: besttechGrowth?.newClients30d || 0,
        besttechProjects: besttechGrowth?.projectCount || 0,
        besttechActiveProjects: besttechGrowth?.activeProjects || 0,
        besttechCompletedProjects: besttechGrowth?.completedProjects || 0,
        besttechPipelineValue: besttechGrowth?.pipelineValue || 0,
        besttechAmountReceived: besttechGrowth?.amountReceived || 0,
        // Best In Print
        bestInPrintClients: bestInPrintGrowth?.clientCount || 0,
        bestInPrintNewClients30d: bestInPrintGrowth?.newClients30d || 0,
        bestInPrintJobs: bestInPrintGrowth?.jobCount || 0,
        bestInPrintInProduction: bestInPrintGrowth?.inProductionJobs || 0,
        bestInPrintDelivered: bestInPrintGrowth?.deliveredJobs || 0,
        bestInPrintPipelineValue: bestInPrintGrowth?.pipelineValue || 0,
        bestInPrintAmountReceived: bestInPrintGrowth?.amountReceived || 0,
        // Oxygen FM
        oxygenAdvertisers: oxygenGrowth?.advertiserCount || 0,
        oxygenNewAdvertisers30d: oxygenGrowth?.newAdvertisers30d || 0,
        oxygenBookings: oxygenGrowth?.bookingCount || 0,
        oxygenRunningOrBooked: oxygenGrowth?.runningOrBooked || 0,
        oxygenCompletedBookings: oxygenGrowth?.completedBookings || 0,
        oxygenPipelineValue: oxygenGrowth?.pipelineValue || 0,
        oxygenAmountReceived: oxygenGrowth?.amountReceived || 0,
        // Trifone
        trifoneCustomers: trifoneGrowth?.customerCount || 0,
        trifoneNewCustomers30d: trifoneGrowth?.newCustomers30d || 0,
        trifoneSales: trifoneGrowth?.saleCount || 0,
        trifoneConfirmedSales: trifoneGrowth?.confirmedSales || 0,
        trifoneDeliveredSales: trifoneGrowth?.deliveredSales || 0,
        trifoneRevenue: trifoneGrowth?.totalRevenue || 0,
        // Accessible Publishers
        accessibleDays: accessibleGrowth?.dayCount || 0,
        accessibleTotalCredit: accessibleGrowth?.totalCredit || 0,
        accessibleTotalDebit: accessibleGrowth?.totalDebit || 0,
        accessibleNetTotal: accessibleGrowth?.netTotal || 0,
      },
      byCategory: smipayGrowth?.byCategory || [],
      byServiceLine: besttechGrowth?.byServiceLine || [],
      byPrintType: bestInPrintGrowth?.byPrintType || [],
      byBookingType: oxygenGrowth?.byBookingType || [],
      byProductCategory: trifoneGrowth?.byProductCategory || [],
      byChannel: trifoneGrowth?.byChannel || [],
      byAccessibleCategory: accessibleGrowth?.byCategory || [],
      byAccessibleLevel: accessibleGrowth?.byLevel || [],
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
        besttech: besttechGrowth?.recentActivity || [],
        bestInPrint: bestInPrintGrowth?.recentActivity || [],
        oxygen: oxygenGrowth?.recentActivity || [],
        trifone: trifoneGrowth?.recentActivity || [],
        accessible: accessibleGrowth?.recentActivity || [],
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
