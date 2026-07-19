const SmehSchool = require('../models/SmehSchool');
const SmehSubscription = require('../models/SmehSubscription');

const daysFromNow = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
};

/**
 * Build SMEH overview / analytics aggregates for admin.
 */
const buildSmehGrowth = async ({ from, to } = {}) => {
  const dateFilter = {};
  if (from || to) {
    dateFilter.date = {};
    if (from) dateFilter.date.$gte = new Date(from);
    if (to) dateFilter.date.$lte = new Date(to);
  }

  const [schools, subscriptions, recentSubs] = await Promise.all([
    SmehSchool.find().select('_id name awareAt').lean(),
    SmehSubscription.find(dateFilter).sort({ date: 1 }).lean(),
    SmehSubscription.find()
      .sort({ date: -1 })
      .limit(8)
      .select(
        'schoolName amount subscriptionStatus startedAt endsAt platformInUse date studentOnboarded teacherOnboarded parentOnboarded'
      )
      .lean(),
  ]);

  const schoolCount = schools.length;
  const activeSchoolIds = new Set();
  let activeSubs = 0;
  let inactiveSubs = 0;
  let subscriptionRevenue = 0;
  let activeRevenue = 0;
  let platformInUseCount = 0;
  let studentOnboarded = 0;
  let teacherOnboarded = 0;
  let parentOnboarded = 0;

  const byDateMap = {};
  const bySchoolMap = {};
  const now = new Date();
  const in30 = daysFromNow(30);
  const expiringSoon = [];

  subscriptions.forEach((r) => {
    const isActive = r.subscriptionStatus === 'active';
    if (isActive) {
      activeSubs += 1;
      activeRevenue += r.amount || 0;
      if (r.school) activeSchoolIds.add(String(r.school));
    } else {
      inactiveSubs += 1;
    }
    subscriptionRevenue += r.amount || 0;

    if (r.platformInUse) platformInUseCount += 1;
    if (r.studentOnboarded) studentOnboarded += 1;
    if (r.teacherOnboarded) teacherOnboarded += 1;
    if (r.parentOnboarded) parentOnboarded += 1;

    const key = r.date ? new Date(r.date).toISOString().slice(0, 10) : 'unknown';
    if (!byDateMap[key]) {
      byDateMap[key] = {
        date: key,
        amount: 0,
        active: 0,
        inactive: 0,
        records: 0,
      };
    }
    byDateMap[key].amount += r.amount || 0;
    byDateMap[key].records += 1;
    if (isActive) byDateMap[key].active += 1;
    else byDateMap[key].inactive += 1;

    const schoolKey = r.schoolName || 'Unknown';
    if (!bySchoolMap[schoolKey]) {
      bySchoolMap[schoolKey] = {
        schoolName: schoolKey,
        amount: 0,
        records: 0,
        active: 0,
      };
    }
    bySchoolMap[schoolKey].amount += r.amount || 0;
    bySchoolMap[schoolKey].records += 1;
    if (isActive) bySchoolMap[schoolKey].active += 1;

    if (
      isActive &&
      r.endsAt &&
      new Date(r.endsAt) >= now &&
      new Date(r.endsAt) <= in30
    ) {
      expiringSoon.push({
        _id: r._id,
        schoolName: r.schoolName,
        amount: r.amount,
        endsAt: r.endsAt,
        startedAt: r.startedAt,
      });
    }
  });

  expiringSoon.sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));

  const recordCount = subscriptions.length;
  const pct = (n) => (recordCount ? Math.round((n / recordCount) * 1000) / 10 : 0);

  return {
    schoolCount,
    subscribedSchoolCount: activeSchoolIds.size,
    awareOnlyCount: Math.max(0, schoolCount - activeSchoolIds.size),
    activeSubs,
    inactiveSubs,
    subscriptionRevenue,
    activeRevenue,
    platformInUseCount,
    studentOnboarded,
    teacherOnboarded,
    parentOnboarded,
    studentOnboardedPct: pct(studentOnboarded),
    teacherOnboardedPct: pct(teacherOnboarded),
    parentOnboardedPct: pct(parentOnboarded),
    platformInUsePct: pct(platformInUseCount),
    recordCount,
    expiringSoon: expiringSoon.slice(0, 10),
    trend: Object.values(byDateMap).sort((a, b) => a.date.localeCompare(b.date)),
    topSchools: Object.values(bySchoolMap)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8),
    recentActivity: recentSubs,
  };
};

module.exports = { buildSmehGrowth };
