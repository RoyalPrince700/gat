const BestInPrintClient = require('../models/BestInPrintClient');
const BestInPrintJob = require('../models/BestInPrintJob');
const { PRINT_TYPES } = require('./bestinprintMeta');

/**
 * Lightweight Best In Print overview aggregates (Phase 1).
 */
const buildBestInPrintGrowth = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [clientCount, newClients30d, jobs, recentJobs] = await Promise.all([
    BestInPrintClient.countDocuments(),
    BestInPrintClient.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    }),
    BestInPrintJob.find()
      .select(
        'status printType contractValue amountReceived title clientName date quantity'
      )
      .lean(),
    BestInPrintJob.find()
      .sort({ date: -1 })
      .limit(8)
      .select('title clientName printType status contractValue date')
      .lean(),
  ]);

  let inProductionJobs = 0;
  let deliveredJobs = 0;
  let pipelineValue = 0;
  let amountReceived = 0;
  const printTypeMap = {};

  PRINT_TYPES.forEach((type) => {
    printTypeMap[type.value] = {
      printType: type.value,
      label: type.label,
      count: 0,
      contractValue: 0,
    };
  });

  jobs.forEach((j) => {
    if (j.status === 'in_production' || j.status === 'confirmed') {
      inProductionJobs += 1;
    }
    if (j.status === 'delivered') deliveredJobs += 1;
    pipelineValue += j.contractValue || 0;
    amountReceived += j.amountReceived || 0;

    const key = j.printType || 'other';
    if (!printTypeMap[key]) {
      printTypeMap[key] = {
        printType: key,
        label: key,
        count: 0,
        contractValue: 0,
      };
    }
    printTypeMap[key].count += 1;
    printTypeMap[key].contractValue += j.contractValue || 0;
  });

  const byPrintType = Object.values(printTypeMap).filter(
    (row) => row.count > 0 || row.contractValue > 0
  );

  return {
    clientCount,
    newClients30d,
    jobCount: jobs.length,
    inProductionJobs,
    deliveredJobs,
    pipelineValue,
    amountReceived,
    byPrintType,
    recentActivity: recentJobs,
  };
};

module.exports = { buildBestInPrintGrowth };
