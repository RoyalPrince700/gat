const mongoose = require('mongoose');
const { ACQUISITION_SOURCE_VALUES } = require('../utils/besttechMeta');

const besttechClientSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    industry: { type: String, default: '', trim: true },
    contactName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    website: { type: String, default: '', trim: true },
    geoState: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    firstContactAt: { type: Date, default: null },
    acquisitionSource: {
      type: String,
      enum: [...ACQUISITION_SOURCE_VALUES, ''],
      default: '',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

besttechClientSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('BesttechClient', besttechClientSchema);
