const mongoose = require('mongoose');

const smehSchoolSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    /** First logged — counts as “aware of platform” */
    awareAt: { type: Date, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

smehSchoolSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('SmehSchool', smehSchoolSchema);
