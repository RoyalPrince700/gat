const mongoose = require('mongoose');
const {
  ACQUISITION_SOURCE_VALUES,
  GEO_STATES,
} = require('../utils/smipayGrowthMeta');

const smipayCustomerSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    joinedAt: { type: Date, required: true },
    firstTransactionAt: { type: Date, default: null },
    lastTransactionAt: { type: Date, default: null },
    /** organic | referral | agent | campaign | social | school | other */
    acquisitionSource: {
      type: String,
      enum: ACQUISITION_SOURCE_VALUES,
      default: 'organic',
      index: true,
    },
    /** Nigerian state / FCT for geo expansion */
    geoState: {
      type: String,
      enum: GEO_STATES,
      default: 'Unknown',
      index: true,
    },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'churn_risk'],
      default: 'active',
    },
  },
  { timestamps: true }
);

smipayCustomerSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('SmipayCustomer', smipayCustomerSchema);
