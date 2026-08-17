const mongoose = require('mongoose');
const { ACCESSIBLE_SEASONS } = require('../utils/accessibleMeta');

/**
 * Historical school book-purchase line items for Accessible Publishers.
 * One Excel row = one document. Separate from AccessibleDailyTotal (ops volumes).
 */
const accessibleSchoolPurchaseSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    season: {
      type: String,
      enum: ACCESSIBLE_SEASONS,
      required: true,
    },
    schoolName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    sourceRow: { type: Number, default: null },
    rawLabel: { type: String, default: '' },
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    importBatchId: { type: String, default: '' },
  },
  { timestamps: true }
);

accessibleSchoolPurchaseSchema.index({ company: 1, season: 1 });
accessibleSchoolPurchaseSchema.index({ company: 1, schoolName: 1 });

module.exports = mongoose.model(
  'AccessibleSchoolPurchase',
  accessibleSchoolPurchaseSchema
);
