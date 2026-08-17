const BesttechClient = require('../models/BesttechClient');
const BesttechProject = require('../models/BesttechProject');
const { SERVICE_LINES } = require('./besttechMeta');

/**
 * Lightweight Best Technology IT overview aggregates (Phase 1).
 */
const buildBesttechGrowth = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [
    clientCount,
    newClients30d,
    projects,
    recentProjects,
  ] = await Promise.all([
    BesttechClient.countDocuments(),
    BesttechClient.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    }),
    BesttechProject.find().select(
      'status serviceLine contractValue amountReceived title clientName date'
    ).lean(),
    BesttechProject.find()
      .sort({ date: -1 })
      .limit(8)
      .select('title clientName serviceLine status contractValue date')
      .lean(),
  ]);

  let activeProjects = 0;
  let completedProjects = 0;
  let pipelineValue = 0;
  let amountReceived = 0;
  const serviceLineMap = {};

  SERVICE_LINES.forEach((line) => {
    serviceLineMap[line.value] = {
      serviceLine: line.value,
      label: line.label,
      count: 0,
      contractValue: 0,
    };
  });

  projects.forEach((p) => {
    if (p.status === 'active' || p.status === 'proposal') activeProjects += 1;
    if (p.status === 'completed') completedProjects += 1;
    pipelineValue += p.contractValue || 0;
    amountReceived += p.amountReceived || 0;

    const key = p.serviceLine || 'other';
    if (!serviceLineMap[key]) {
      serviceLineMap[key] = {
        serviceLine: key,
        label: key,
        count: 0,
        contractValue: 0,
      };
    }
    serviceLineMap[key].count += 1;
    serviceLineMap[key].contractValue += p.contractValue || 0;
  });

  const byServiceLine = Object.values(serviceLineMap).filter(
    (row) => row.count > 0 || row.contractValue > 0
  );

  return {
    clientCount,
    newClients30d,
    projectCount: projects.length,
    activeProjects,
    completedProjects,
    pipelineValue,
    amountReceived,
    byServiceLine,
    recentActivity: recentProjects,
  };
};

module.exports = { buildBesttechGrowth };
