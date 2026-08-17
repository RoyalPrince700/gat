const mongoose = require('mongoose');
const {
  ACQUISITION_SOURCE_VALUES,
  CLIENT_TYPE_VALUES,
} = require('../utils/bestinprintMeta');

const bestInPrintClientSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    clientType: {
      type: String,
      enum: [...CLIENT_TYPE_VALUES, ''],
      default: '',
    },
    contactName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
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

bestInPrintClientSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('BestInPrintClient', bestInPrintClientSchema);
