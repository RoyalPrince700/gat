const express = require('express');
const AccessibleDailyTotal = require('../models/AccessibleDailyTotal');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  ACCESSIBLE_CATEGORIES,
  ACCESSIBLE_LEVELS,
  ACCESSIBLE_CATEGORY_VALUES,
  ACCESSIBLE_LEVEL_VALUES,
  ACCESSIBLE_SLUG,
} = require('../utils/accessibleMeta');

const router = express.Router();

const getAccessibleCompany = async () =>
  Company.findOne({ slug: ACCESSIBLE_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === ACCESSIBLE_SLUG;
};

const toDayStart = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const emptyCategories = () => {
  const out = {};
  ACCESSIBLE_CATEGORY_VALUES.forEach((key) => {
    out[key] = { volume: 0, count: 0 };
  });
  return out;
};

const emptyLevels = () => {
  const out = {};
  ACCESSIBLE_LEVEL_VALUES.forEach((key) => {
    out[key] = { volume: 0 };
  });
  return out;
};

const parseNonNegNumber = (value, label) => {
  if (value === '' || value == null) return { value: 0 };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { error: `Invalid ${label}. Must be a number ≥ 0.` };
  }
  return { value: n };
};

/**
 * Normalize body into categories, levels, totals.
 * - If any category volume > 0: totalCredit = sum of category volumes
 * - Else if totalCredit provided: use it (categories stay zero)
 * - Levels are optional and independent
 */
const parsePayload = (body) => {
  const rawCats =
    body.categories && typeof body.categories === 'object'
      ? body.categories
      : body;
  const categories = emptyCategories();
  let categoryVolumeSum = 0;
  let hasCategoryVolume = false;

  for (const key of ACCESSIBLE_CATEGORY_VALUES) {
    const entry = rawCats[key];
    let volume = 0;
    let count = 0;

    if (entry && typeof entry === 'object') {
      volume = entry.volume;
      count = entry.count;
    } else {
      const flatVolume = rawCats[`${key}Volume`] ?? rawCats[`${key}_volume`];
      const flatCount = rawCats[`${key}Count`] ?? rawCats[`${key}_count`];
      if (flatVolume != null && flatVolume !== '') volume = flatVolume;
      if (flatCount != null && flatCount !== '') count = flatCount;
    }

    const volParsed = parseNonNegNumber(volume, `${key} volume`);
    if (volParsed.error) return { error: volParsed.error };
    const countParsed = parseNonNegNumber(count, `${key} count`);
    if (countParsed.error) return { error: countParsed.error };

    let c = countParsed.value;
    if (!Number.isInteger(c)) c = Math.floor(c);

    categories[key] = { volume: volParsed.value, count: c };
    categoryVolumeSum += volParsed.value;
    if (volParsed.value > 0) hasCategoryVolume = true;
  }

  const rawLevels =
    body.levels && typeof body.levels === 'object' ? body.levels : body;
  const levels = emptyLevels();
  let hasLevelVolume = false;

  for (const key of ACCESSIBLE_LEVEL_VALUES) {
    const entry = rawLevels[key];
    let volume = 0;
    if (entry && typeof entry === 'object') {
      volume = entry.volume;
    } else {
      const flat =
        rawLevels[`${key}Volume`] ??
        rawLevels[`${key}_volume`] ??
        rawLevels[key];
      if (flat != null && flat !== '' && typeof flat !== 'object') volume = flat;
    }
    const volParsed = parseNonNegNumber(volume, `${key} level volume`);
    if (volParsed.error) return { error: volParsed.error };
    levels[key] = { volume: volParsed.value };
    if (volParsed.value > 0) hasLevelVolume = true;
  }

  let totalCredit;
  if (hasCategoryVolume) {
    totalCredit = categoryVolumeSum;
  } else {
    const creditParsed = parseNonNegNumber(
      body.totalCredit ?? body.total_credit,
      'total credit'
    );
    if (creditParsed.error) return { error: creditParsed.error };
    totalCredit = creditParsed.value;
  }

  const debitParsed = parseNonNegNumber(
    body.totalDebit ?? body.total_debit,
    'total debit'
  );
  if (debitParsed.error) return { error: debitParsed.error };
  const totalDebit = debitParsed.value;

  if (totalCredit <= 0 && !hasCategoryVolume && !hasLevelVolume) {
    return {
      error:
        'Enter total credit, at least one category volume, or an education level volume.',
    };
  }

  const netTotal = totalCredit - totalDebit;

  return {
    categories,
    levels,
    totalCredit,
    totalDebit,
    netTotal,
  };
};

router.get('/meta', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res
      .status(403)
      .json({ message: 'No access to Accessible Publishers data' });
  }
  res.json({
    categories: ACCESSIBLE_CATEGORIES,
    levels: ACCESSIBLE_LEVELS,
  });
});

router.get('/daily-totals', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({
        message: 'Accessible Publishers company not found. Run seed.',
      });
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

    const records = await AccessibleDailyTotal.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/daily-totals/by-date/:date', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({
        message: 'Accessible Publishers company not found. Run seed.',
      });
    }

    const day = toDayStart(req.params.date);
    const record = await AccessibleDailyTotal.findOne({
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

router.get('/daily-totals/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const record = await AccessibleDailyTotal.findById(req.params.id).populate(
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
router.post('/daily-totals', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({
        message: 'Accessible Publishers company not found. Run seed.',
      });
    }

    const { date, notes } = req.body;
    if (!date) {
      return res.status(400).json({ message: 'date is required' });
    }

    const parsed = parsePayload(req.body);
    if (parsed.error) {
      return res.status(400).json({ message: parsed.error });
    }

    const day = toDayStart(date);
    const payload = {
      company: company._id,
      createdBy: req.user._id,
      date: day,
      totalCredit: parsed.totalCredit,
      totalDebit: parsed.totalDebit,
      netTotal: parsed.netTotal,
      categories: parsed.categories,
      levels: parsed.levels,
      notes: notes != null ? String(notes) : '',
    };

    const record = await AccessibleDailyTotal.findOneAndUpdate(
      { company: company._id, date: day },
      { $set: payload },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
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

router.put('/daily-totals/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const record = await AccessibleDailyTotal.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Daily total not found' });
    }

    const { date, notes } = req.body;
    const hasMoneyInput =
      req.body.totalCredit != null ||
      req.body.totalDebit != null ||
      req.body.categories != null ||
      req.body.levels != null ||
      ACCESSIBLE_CATEGORY_VALUES.some(
        (key) =>
          req.body[key] != null ||
          req.body[`${key}Volume`] != null ||
          req.body[`${key}Count`] != null
      ) ||
      ACCESSIBLE_LEVEL_VALUES.some(
        (key) =>
          req.body[key] != null || req.body[`${key}Volume`] != null
      );

    if (hasMoneyInput) {
      const parsed = parsePayload(req.body);
      if (parsed.error) {
        return res.status(400).json({ message: parsed.error });
      }
      record.totalCredit = parsed.totalCredit;
      record.totalDebit = parsed.totalDebit;
      record.netTotal = parsed.netTotal;
      record.categories = parsed.categories;
      record.levels = parsed.levels;
    }

    if (date) record.date = toDayStart(date);
    if (notes !== undefined) record.notes = notes != null ? String(notes) : '';
    record.createdBy = req.user._id;

    await record.save();
    const populated = await AccessibleDailyTotal.findById(record._id).populate(
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

router.delete('/daily-totals/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const record = await AccessibleDailyTotal.findById(req.params.id);
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
