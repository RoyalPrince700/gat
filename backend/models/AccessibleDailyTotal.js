const mongoose = require('mongoose');
const {
  ACCESSIBLE_CATEGORY_VALUES,
  ACCESSIBLE_LEVEL_VALUES,
} = require('../utils/accessibleMeta');

/**
 * Company-level daily totals for Accessible Publishers Limited.
 * Unique key: one shared total per company per calendar day.
 * No individual book sales / line-item transactions.
 */
const volumeCountSchema = new mongoose.Schema(
  {
    volume: { type: Number, default: 0, min: 0 },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const volumeOnlySchema = new mongoose.Schema(
  {
    volume: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const categoriesFields = {};
ACCESSIBLE_CATEGORY_VALUES.forEach((key) => {
  categoriesFields[key] = {
    type: volumeCountSchema,
    default: () => ({ volume: 0, count: 0 }),
  };
});

const levelsFields = {};
ACCESSIBLE_LEVEL_VALUES.forEach((key) => {
  levelsFields[key] = {
    type: volumeOnlySchema,
    default: () => ({ volume: 0 }),
  };
});

const accessibleDailyTotalSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** Calendar day at local start-of-day */
    date: { type: Date, required: true },
    totalCredit: { type: Number, default: 0, min: 0 },
    totalDebit: { type: Number, default: 0, min: 0 },
    netTotal: { type: Number, default: 0 },
    categories: {
      type: new mongoose.Schema(categoriesFields, { _id: false }),
      default: () => ({}),
    },
    levels: {
      type: new mongoose.Schema(levelsFields, { _id: false }),
      default: () => ({}),
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

/** Company-wide daily ops log: one shared total per day (not per user). */
accessibleDailyTotalSchema.index({ company: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AccessibleDailyTotal', accessibleDailyTotalSchema);
