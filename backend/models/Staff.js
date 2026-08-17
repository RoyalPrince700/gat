const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    jobTitle: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

staffSchema.index({ name: 'text', department: 'text', jobTitle: 'text' });
staffSchema.index({ status: 1, department: 1 });
staffSchema.index({ company: 1 });

module.exports = mongoose.model('Staff', staffSchema);
