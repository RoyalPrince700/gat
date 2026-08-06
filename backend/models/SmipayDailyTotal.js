const mongoose = require('mongoose');
const { SMIPAY_CATEGORY_VALUES } = require('../utils/smipayCategories');

/**
 * Company-level daily volume summary (parallel to SmipayRecord).
 * Unique key: one shared total per company per calendar day.
 * Individual transaction analytics stay on SmipayRecord only.
 */
const categoryEntrySchema = new mongoose.Schema(
  {
    volume: { type: Number, default: 0, min: 0 },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const categoriesFields = {};
SMIPAY_CATEGORY_VALUES.forEach((key) => {
  categoriesFields[key] = {
    type: categoryEntrySchema,
    default: () => ({ volume: 0, count: 0 }),
  };
});

const smipayDailyTotalSchema = new mongoose.Schema(
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
    categories: {
      type: new mongoose.Schema(categoriesFields, { _id: false }),
      default: () => ({}),
    },
    totalVolume: { type: Number, default: 0, min: 0 },
    totalTransactions: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

/** Company-wide daily ops log: one shared total per day (not per user). */
smipayDailyTotalSchema.index({ company: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('SmipayDailyTotal', smipayDailyTotalSchema);
