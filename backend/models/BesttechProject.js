const mongoose = require('mongoose');
const {
  SERVICE_LINE_VALUES,
  SERVICE_TYPE_VALUES,
  PROJECT_STATUS_VALUES,
} = require('../utils/besttechMeta');

const besttechProjectSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BesttechClient',
      required: true,
      index: true,
    },
    clientName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    serviceLine: {
      type: String,
      enum: SERVICE_LINE_VALUES,
      required: true,
      index: true,
    },
    serviceType: {
      type: String,
      enum: SERVICE_TYPE_VALUES,
      required: true,
      default: 'other',
    },
    status: {
      type: String,
      enum: PROJECT_STATUS_VALUES,
      required: true,
      default: 'lead',
      index: true,
    },
    contractValue: { type: Number, default: 0, min: 0 },
    amountReceived: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    date: { type: Date, required: true, index: true },
    deliverablesNote: { type: String, default: '' },
    isRetainer: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

besttechProjectSchema.index({ company: 1, date: -1 });
besttechProjectSchema.index({ serviceLine: 1, status: 1 });

module.exports = mongoose.model('BesttechProject', besttechProjectSchema);
