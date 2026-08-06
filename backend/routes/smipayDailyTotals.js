const express = require('express');
const SmipayDailyTotal = require('../models/SmipayDailyTotal');
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');
const {
  SMIPAY_CATEGORIES,
  SMIPAY_CATEGORY_VALUES,
} = require('../utils/smipayCategories');

const router = express.Router();

const getSmipayCompany = async () => Company.findOne({ slug: 'smipay' });

const canAccess = (user) => {
  if (user.role === 'admin') return true;
  return user.company && user.company.slug === 'smipay';
};

const toDayStart = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const emptyCategories = () => {
  const out = {};
  SMIPAY_CATEGORY_VALUES.forEach((key) => {
    out[key] = { volume: 0, count: 0 };
  });
  return out;
};

/**
 * Normalize body.categories into validated { volume, count } per category.
 * Accepts nested object or flat keys like depositVolume / depositCount.
 */
const parseCategories = (body) => {
  const raw = body.categories && typeof body.categories === 'object'
    ? body.categories
    : body;
  const categories = emptyCategories();
  let totalVolume = 0;
  let totalTransactions = 0;
  let hasNonZero = false;

  for (const key of SMIPAY_CATEGORY_VALUES) {
    const entry = raw[key];
    let volume = 0;
    let count = 0;

    if (entry && typeof entry === 'object') {
      volume = entry.volume;
      count = entry.count;
    } else {
      const flatVolume =
        raw[`${key}Volume`] ?? raw[`${key}_volume`];
      const flatCount =
        raw[`${key}Count`] ?? raw[`${key}_count`];
      if (flatVolume != null && flatVolume !== '') volume = flatVolume;
      if (flatCount != null && flatCount !== '') count = flatCount;
    }

    if (volume === '' || volume == null) volume = 0;
    if (count === '' || count == null) count = 0;

    volume = Number(volume);
    count = Number(count);

    if (!Number.isFinite(volume) || volume < 0) {
      return {
        error: `Invalid volume for ${key}. Must be a number ≥ 0.`,
      };
    }
    if (!Number.isFinite(count) || count < 0) {
      return {
        error: `Invalid count for ${key}. Must be a number ≥ 0.`,
      };
    }

    // Allow non-integer counts? Spec says counts — prefer integers
    if (!Number.isInteger(count)) {
      count = Math.floor(count);
    }

    categories[key] = { volume, count };
    totalVolume += volume;
    totalTransactions += count;
    if (volume > 0 || count > 0) hasNonZero = true;
  }

  if (!hasNonZero) {
    return {
      error: 'Enter at least one non-zero category volume or count.',
    };
  }

  return { categories, totalVolume, totalTransactions };
};

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found. Run seed.' });
    }

    const { from, to } = req.query;
    const filter = { company: company._id };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toDayStart(from);
      if (to) {
        const end = toDayStart(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const records = await SmipayDailyTotal.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/meta/categories', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Smipay data' });
  }
  res.json(SMIPAY_CATEGORIES);
});

router.get('/by-date/:date', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found. Run seed.' });
    }

    const day = toDayStart(req.params.date);
    const record = await SmipayDailyTotal.findOne({
      company: company._id,
      date: day,
    }).populate('createdBy', 'name email');

    if (!record) {
      return res.status(404).json({ message: 'No daily total for this date' });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const record = await SmipayDailyTotal.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );
    if (!record) {
      return res.status(404).json({ message: 'Daily total not found' });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Upsert by (company, date) — company-wide shared daily total */
router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found. Run seed.' });
    }

    const { date, notes } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'date is required' });
    }

    const parsed = parseCategories(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const day = toDayStart(date);
    const payload = {
      company: company._id,
      createdBy: req.user._id,
      date: day,
      categories: parsed.categories,
      totalVolume: parsed.totalVolume,
      totalTransactions: parsed.totalTransactions,
      notes: notes != null ? String(notes) : '',
    };

    const record = await SmipayDailyTotal.findOneAndUpdate(
      { company: company._id, date: day },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.status(201).json(record);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A daily total for this date already exists. Edit it instead.',
      });
    }
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const record = await SmipayDailyTotal.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Daily total not found' });
    }

    const { date, notes } = req.body;
    const hasCategoryInput =
      req.body.categories != null ||
      SMIPAY_CATEGORY_VALUES.some(
        (key) =>
          req.body[key] != null ||
          req.body[`${key}Volume`] != null ||
          req.body[`${key}Count`] != null
      );

    if (hasCategoryInput) {
      const parsed = parseCategories(req.body);
      if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
      }
      record.categories = parsed.categories;
      record.totalVolume = parsed.totalVolume;
      record.totalTransactions = parsed.totalTransactions;
    }

    if (date) record.date = toDayStart(date);
    if (notes !== undefined) record.notes = notes != null ? String(notes) : '';
    record.createdBy = req.user._id;

    await record.save();
    const populated = await SmipayDailyTotal.findById(record._id).populate(
      'createdBy',
      'name email'
    );
    res.json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'A daily total for this date already exists.',
      });
    }
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const record = await SmipayDailyTotal.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Daily total not found' });
    }

    await record.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
