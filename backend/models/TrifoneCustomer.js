const mongoose = require('mongoose');
const {
  CUSTOMER_TYPE_VALUES,
  ACQUISITION_SOURCE_VALUES,
} = require('../utils/trifoneMeta');

const trifoneCustomerSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    customerType: {
      type: String,
      enum: [...CUSTOMER_TYPE_VALUES, ''],
      default: 'other',
    },
    contactName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    city: { type: String, default: '', trim: true },
    geoState: { type: String, default: '', trim: true },
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

trifoneCustomerSchema.index({ company: 1, name: 1 });

module.exports = mongoose.model('TrifoneCustomer', trifoneCustomerSchema);
