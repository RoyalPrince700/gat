const mongoose = require('mongoose');
const {
  KPI_METRIC_VALUES,
  KPI_PERIOD_VALUES,
  KPI_PLATFORM_VALUES,
  SMIPAY_CATEGORY_VALUES,
} = require('../utils/smipayKpiMeta');

const smipayKpiSchema = new mongoose.Schema(
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
    name: { type: String, required: true, trim: true },
    metric: {
      type: String,
      enum: KPI_METRIC_VALUES,
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: KPI_PERIOD_VALUES,
      required: true,
      index: true,
    },
    target: { type: Number, required: true, min: 0 },
    /** For social_followers: all | facebook | linkedin | instagram | twitter */
    platform: {
      type: String,
      enum: KPI_PLATFORM_VALUES,
      default: 'all',
    },
    /** For category_volume */
    category: {
      type: String,
      enum: SMIPAY_CATEGORY_VALUES,
      required: false,
      default: undefined,
    },
    notes: { type: String, default: '', trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

smipayKpiSchema.index({ company: 1, metric: 1, period: 1, active: 1 });

module.exports = mongoose.model('SmipayKpi', smipayKpiSchema);
