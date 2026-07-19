const { COST_CATEGORIES } = require('./smipayCostMeta');

const categoryLabel = (value) =>
  COST_CATEGORIES.find((c) => c.value === value)?.label || value;

const safeDiv = (num, den) => {
  if (!den || !Number.isFinite(den) || den <= 0) return null;
  if (!Number.isFinite(num)) return null;
  return num / den;
};

const kpiStatus = (progressPct) => {
  if (progressPct >= 100) return 'met';
  if (progressPct >= 70) return 'on_track';
  if (progressPct >= 40) return 'at_risk';
  return 'behind';
};

/**
 * Derive CAC + KPI progress for a single cost line.
 * Expected CAC = spend / expected users
 * Actual CAC   = spend / actual users (when > 0)
 */
const evaluateCost = (cost) => {
  const amount = Number(cost.amount) || 0;
  const expectedUsers = Number(cost.expectedUsers) || 0;
  const actualUsers = Number(cost.actualUsers) || 0;

  const expectedCac = safeDiv(amount, expectedUsers);
  const actualCac = safeDiv(amount, actualUsers);
  const progressPct =
    expectedUsers > 0
      ? Math.round((actualUsers / expectedUsers) * 1000) / 10
      : 0;
  const usersRemaining = Math.max(0, expectedUsers - actualUsers);
  const status = kpiStatus(progressPct);

  /** Positive = beating expected CAC (cheaper per user); negative = worse */
  let cacDeltaPct = null;
  if (expectedCac != null && actualCac != null && expectedCac > 0) {
    cacDeltaPct =
      Math.round(((expectedCac - actualCac) / expectedCac) * 1000) / 10;
  }

  return {
    categoryLabel: categoryLabel(cost.category),
    amount,
    expectedUsers,
    actualUsers,
    expectedCac,
    actualCac,
    progressPct,
    usersRemaining,
    status,
    cacDeltaPct,
    met: progressPct >= 100,
  };
};

const buildSummary = (costsWithResults) => {
  const active = costsWithResults.filter((c) => c.active);
  const totalSpend = active.reduce((s, c) => s + (c.result?.amount || 0), 0);
  const totalExpectedUsers = active.reduce(
    (s, c) => s + (c.result?.expectedUsers || 0),
    0
  );
  const totalActualUsers = active.reduce(
    (s, c) => s + (c.result?.actualUsers || 0),
    0
  );

  const byCategory = {};
  for (const c of active) {
    const key = c.category;
    if (!byCategory[key]) {
      byCategory[key] = {
        category: key,
        label: c.result?.categoryLabel || categoryLabel(key),
        spend: 0,
        expectedUsers: 0,
        actualUsers: 0,
      };
    }
    byCategory[key].spend += c.result?.amount || 0;
    byCategory[key].expectedUsers += c.result?.expectedUsers || 0;
    byCategory[key].actualUsers += c.result?.actualUsers || 0;
  }

  const categoryBreakdown = Object.values(byCategory).map((row) => ({
    ...row,
    expectedCac: safeDiv(row.spend, row.expectedUsers),
    actualCac: safeDiv(row.spend, row.actualUsers),
    progressPct:
      row.expectedUsers > 0
        ? Math.round((row.actualUsers / row.expectedUsers) * 1000) / 10
        : 0,
  }));

  return {
    total: costsWithResults.length,
    active: active.length,
    met: active.filter((c) => c.result?.met).length,
    onTrack: active.filter((c) => c.result?.status === 'on_track').length,
    atRisk: active.filter((c) => c.result?.status === 'at_risk').length,
    behind: active.filter((c) => c.result?.status === 'behind').length,
    totalSpend,
    totalExpectedUsers,
    totalActualUsers,
    blendedExpectedCac: safeDiv(totalSpend, totalExpectedUsers),
    blendedActualCac: safeDiv(totalSpend, totalActualUsers),
    overallProgressPct:
      totalExpectedUsers > 0
        ? Math.round((totalActualUsers / totalExpectedUsers) * 1000) / 10
        : 0,
    categoryBreakdown,
  };
};

module.exports = {
  evaluateCost,
  buildSummary,
  categoryLabel,
  safeDiv,
};
