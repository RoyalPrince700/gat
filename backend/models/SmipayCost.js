const mongoose = require('mongoose');
const { COST_CATEGORY_VALUES } = require('../utils/smipayCostMeta');

const smipayCostSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** e.g. Marketing Partnership, Campus Ambassador */
    label: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: COST_CATEGORY_VALUES,
      required: true,
      index: true,
    },
    /** Spend amount in NGN */
    amount: { type: Number, required: true, min: 0 },
    /** Expected users from this spend (KPI) */
    expectedUsers: { type: Number, required: true, min: 0 },
    /** Users achieved so far — admin updates as users come in */
    actualUsers: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: { type: String, default: '', trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

smipayCostSchema.index({ company: 1, category: 1, active: 1 });

module.exports = mongoose.model('SmipayCost', smipayCostSchema);
