const express = require('express');
const SmipayCost = require('../models/SmipayCost');
const Company = require('../models/Company');
const { protect, adminOnly } = require('../middleware/auth');
const {
  COST_CATEGORIES,
  COST_CATEGORY_VALUES,
} = require('../utils/smipayCostMeta');
const { evaluateCost, buildSummary } = require('../utils/smipayCostActuals');

const router = express.Router();

const getSmipayCompany = async () => Company.findOne({ slug: 'smipay' });

const parseOptionalDate = (value) => {
  if (value === null || value === '' || value === undefined) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
};

const validatePayload = (body) => {
  const {
    label,
    category,
    amount,
    expectedUsers,
    actualUsers = 0,
    startDate,
    endDate,
    notes = '',
    active = true,
  } = body;

  if (!label || !String(label).trim()) {
    return { error: 'Label is required' };
  }
  if (!category || !COST_CATEGORY_VALUES.includes(category)) {
    return { error: 'Invalid cost category' };
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    return { error: 'Amount must be a non-negative number' };
  }

  const expectedNum = Number(expectedUsers);
  if (!Number.isFinite(expectedNum) || expectedNum < 0) {
    return { error: 'Expected users must be a non-negative number' };
  }

  const actualNum = Number(actualUsers);
  if (!Number.isFinite(actualNum) || actualNum < 0) {
    return { error: 'Actual users must be a non-negative number' };
  }

  const start = parseOptionalDate(startDate);
  if (start === undefined) {
    return { error: 'Invalid start date' };
  }
  const end = parseOptionalDate(endDate);
  if (end === undefined) {
    return { error: 'Invalid end date' };
  }

  return {
    payload: {
      label: String(label).trim(),
      category,
      amount: amountNum,
      expectedUsers: expectedNum,
      actualUsers: actualNum,
      startDate: start,
      endDate: end,
      notes: notes ? String(notes).trim() : '',
      active: active !== false && active !== 'false',
    },
  };
};

router.get('/meta', protect, adminOnly, (req, res) => {
  res.json({ categories: COST_CATEGORIES });
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
    if (
      req.query.category &&
      COST_CATEGORY_VALUES.includes(req.query.category)
    ) {
      filter.category = req.query.category;
    }

    const costs = await SmipayCost.find(filter)
      .sort({ active: -1, category: 1, createdAt: -1 })
      .populate('createdBy', 'name email');

    const withResults = costs.map((cost) => ({
      ...cost.toObject(),
      result: evaluateCost(cost),
    }));

    res.json({
      costs: withResults,
      summary: buildSummary(withResults),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load costs' });
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

    const cost = await SmipayCost.create({
      ...payload,
      company: company._id,
      createdBy: req.user._id,
    });

    res.status(201).json({
      ...cost.toObject(),
      result: evaluateCost(cost),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create cost' });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found' });
    }

    const cost = await SmipayCost.findOne({
      _id: req.params.id,
      company: company._id,
    });
    if (!cost) return res.status(404).json({ message: 'Cost not found' });

    const { error, payload } = validatePayload({
      label: req.body.label ?? cost.label,
      category: req.body.category ?? cost.category,
      amount: req.body.amount ?? cost.amount,
      expectedUsers: req.body.expectedUsers ?? cost.expectedUsers,
      actualUsers:
        req.body.actualUsers !== undefined
          ? req.body.actualUsers
          : cost.actualUsers,
      startDate:
        req.body.startDate !== undefined ? req.body.startDate : cost.startDate,
      endDate: req.body.endDate !== undefined ? req.body.endDate : cost.endDate,
      notes: req.body.notes ?? cost.notes,
      active: req.body.active ?? cost.active,
    });
    if (error) return res.status(400).json({ message: error });

    Object.assign(cost, payload);
    await cost.save();

    res.json({
      ...cost.toObject(),
      result: evaluateCost(cost),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update cost' });
  }
});

/** Quick update for actual users as acquisitions come in */
router.patch('/:id/actual-users', protect, adminOnly, async (req, res) => {
  try {
    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found' });
    }

    const cost = await SmipayCost.findOne({
      _id: req.params.id,
      company: company._id,
    });
    if (!cost) return res.status(404).json({ message: 'Cost not found' });

    const actualNum = Number(req.body.actualUsers);
    if (!Number.isFinite(actualNum) || actualNum < 0) {
      return res
        .status(400)
        .json({ message: 'Actual users must be a non-negative number' });
    }

    cost.actualUsers = actualNum;
    await cost.save();

    res.json({
      ...cost.toObject(),
      result: evaluateCost(cost),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || 'Failed to update actual users' });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found' });
    }

    const cost = await SmipayCost.findOneAndDelete({
      _id: req.params.id,
      company: company._id,
    });
    if (!cost) return res.status(404).json({ message: 'Cost not found' });

    res.json({ message: 'Cost deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete cost' });
  }
});

module.exports = router;
