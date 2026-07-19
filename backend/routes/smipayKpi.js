const express = require('express');
const SmipayKpi = require('../models/SmipayKpi');
const Company = require('../models/Company');
const { protect, adminOnly } = require('../middleware/auth');
const {
  KPI_METRICS,
  KPI_PERIODS,
  KPI_METRIC_VALUES,
  KPI_PERIOD_VALUES,
  KPI_PLATFORM_VALUES,
  SMIPAY_CATEGORY_VALUES,
} = require('../utils/smipayKpiMeta');
const { evaluateKpi, metricMeta } = require('../utils/smipayKpiActuals');
const { SOCIAL_MEDIA_PLATFORMS } = require('../utils/socialMediaPlatforms');
const { SMIPAY_CATEGORIES } = require('../utils/smipayCategories');

const router = express.Router();

const getSmipayCompany = async () => Company.findOne({ slug: 'smipay' });

const defaultName = (metric, period, extras = {}) => {
  const meta = metricMeta(metric);
  const periodLabel =
    KPI_PERIODS.find((p) => p.value === period)?.label || period;
  let label = `${meta.label} (${periodLabel.toLowerCase()})`;
  if (metric === 'social_followers' && extras.platform && extras.platform !== 'all') {
    const plat = SOCIAL_MEDIA_PLATFORMS.find((p) => p.value === extras.platform);
    label = `${plat?.label || extras.platform} followers (${periodLabel.toLowerCase()})`;
  }
  if (metric === 'category_volume' && extras.category) {
    const cat = SMIPAY_CATEGORIES.find((c) => c.value === extras.category);
    label = `${cat?.label || extras.category} volume (${periodLabel.toLowerCase()})`;
  }
  return label;
};

const validatePayload = (body) => {
  const {
    name,
    metric,
    period,
    target,
    platform = 'all',
    category,
    notes = '',
    active = true,
  } = body;

  if (!metric || !KPI_METRIC_VALUES.includes(metric)) {
    return { error: 'Invalid KPI metric' };
  }
  if (!period || !KPI_PERIOD_VALUES.includes(period)) {
    return { error: 'Invalid KPI period' };
  }
  const targetNum = Number(target);
  if (!Number.isFinite(targetNum) || targetNum < 0) {
    return { error: 'Target must be a non-negative number' };
  }
  if (platform && !KPI_PLATFORM_VALUES.includes(platform)) {
    return { error: 'Invalid social platform' };
  }
  if (metric === 'category_volume') {
    if (!category || !SMIPAY_CATEGORY_VALUES.includes(category)) {
      return { error: 'Category is required for category volume KPIs' };
    }
  }
  if (metric === 'social_followers' && platform && !KPI_PLATFORM_VALUES.includes(platform)) {
    return { error: 'Invalid social platform' };
  }

  const meta = metricMeta(metric);
  const payload = {
    name: (name && String(name).trim()) || defaultName(metric, period, { platform, category }),
    metric,
    period,
    target: targetNum,
    platform: meta.supportsPlatform ? platform || 'all' : 'all',
    notes: notes ? String(notes).trim() : '',
    active: active !== false && active !== 'false',
  };

  if (meta.supportsCategory && category) {
    payload.category = category;
  } else {
    payload.category = undefined;
  }

  return { payload };
};

router.get('/meta', protect, adminOnly, (req, res) => {
  res.json({
    metrics: KPI_METRICS,
    periods: KPI_PERIODS,
    platforms: [{ value: 'all', label: 'All platforms' }, ...SOCIAL_MEDIA_PLATFORMS],
    categories: SMIPAY_CATEGORIES,
  });
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found' });
    }

    const filter = { company: company._id };
    if (req.query.active === 'true') filter.active = true;
    if (req.query.active === 'false') filter.active = false;
    if (req.query.period && KPI_PERIOD_VALUES.includes(req.query.period)) {
      filter.period = req.query.period;
    }
    if (req.query.metric && KPI_METRIC_VALUES.includes(req.query.metric)) {
      filter.metric = req.query.metric;
    }

    const kpis = await SmipayKpi.find(filter)
      .sort({ active: -1, period: 1, metric: 1, createdAt: -1 })
      .populate('createdBy', 'name email');

    const asOf = req.query.asOf ? new Date(req.query.asOf) : new Date();
    const withResults = await Promise.all(
      kpis.map(async (kpi) => {
        const result = await evaluateKpi(kpi, asOf);
        return {
          ...kpi.toObject(),
          result,
        };
      })
    );

    const summary = {
      total: withResults.length,
      active: withResults.filter((k) => k.active).length,
      met: withResults.filter((k) => k.active && k.result.met).length,
      onTrack: withResults.filter((k) => k.active && k.result.status === 'on_track').length,
      atRisk: withResults.filter((k) => k.active && k.result.status === 'at_risk').length,
      behind: withResults.filter((k) => k.active && k.result.status === 'behind').length,
    };

    res.json({ kpis: withResults, summary, asOf: asOf.toISOString() });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load KPIs' });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found' });
    }

    const { error, payload } = validatePayload(req.body);
    if (error) return res.status(400).json({ message: error });

    const kpi = await SmipayKpi.create({
      ...payload,
      company: company._id,
      createdBy: req.user._id,
    });

    const result = await evaluateKpi(kpi);
    res.status(201).json({ ...kpi.toObject(), result });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create KPI' });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found' });
    }

    const kpi = await SmipayKpi.findOne({
      _id: req.params.id,
      company: company._id,
    });
    if (!kpi) return res.status(404).json({ message: 'KPI not found' });

    const { error, payload } = validatePayload({
      name: req.body.name ?? kpi.name,
      metric: req.body.metric ?? kpi.metric,
      period: req.body.period ?? kpi.period,
      target: req.body.target ?? kpi.target,
      platform: req.body.platform ?? kpi.platform,
      category: req.body.category ?? kpi.category,
      notes: req.body.notes ?? kpi.notes,
      active: req.body.active ?? kpi.active,
    });
    if (error) return res.status(400).json({ message: error });

    Object.assign(kpi, payload);
    if (!payload.category) {
      kpi.set('category', undefined);
    }
    await kpi.save();

    const result = await evaluateKpi(kpi);
    res.json({ ...kpi.toObject(), result });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update KPI' });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found' });
    }

    const kpi = await SmipayKpi.findOneAndDelete({
      _id: req.params.id,
      company: company._id,
    });
    if (!kpi) return res.status(404).json({ message: 'KPI not found' });

    res.json({ message: 'KPI deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete KPI' });
  }
});

module.exports = router;
