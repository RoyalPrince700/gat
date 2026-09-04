const mongoose = require('mongoose');
const {
  ACCESSIBLE_DEPARTMENT_VALUES,
} = require('../utils/accessibleDepartments');

/**
 * Monthly department performance reports for Accessible Publishers.
 * Unique key: one report per company + department + period (YYYY-MM).
 */
const accessibleDepartmentReportSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    department: {
      type: String,
      required: true,
      enum: ACCESSIBLE_DEPARTMENT_VALUES,
      trim: true,
    },
    /** Calendar month key, e.g. 2026-08 */
    period: { type: String, required: true, trim: true },
    periodLabel: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    /** Markdown body shown on the Reports tab */
    content: { type: String, default: '' },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

accessibleDepartmentReportSchema.index(
  { company: 1, department: 1, period: 1 },
  { unique: true }
);
accessibleDepartmentReportSchema.index({ company: 1, period: 1 });

module.exports = mongoose.model(
  'AccessibleDepartmentReport',
  accessibleDepartmentReportSchema
);
