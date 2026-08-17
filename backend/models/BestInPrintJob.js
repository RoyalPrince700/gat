const mongoose = require('mongoose');
const {
  PRINT_TYPE_VALUES,
  JOB_STATUS_VALUES,
  COLOUR_MODE_VALUES,
  PAPER_TYPE_VALUES,
} = require('../utils/bestinprintMeta');

const bestInPrintJobSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BestInPrintClient',
      required: true,
      index: true,
    },
    clientName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    printType: {
      type: String,
      enum: PRINT_TYPE_VALUES,
      required: true,
      index: true,
    },
    paperType: {
      type: String,
      enum: [...PAPER_TYPE_VALUES, ''],
      default: '',
    },
    quantity: { type: Number, default: 0, min: 0 },
    pages: { type: Number, default: null, min: 0 },
    colourMode: {
      type: String,
      enum: [...COLOUR_MODE_VALUES, ''],
      default: '',
    },
    status: {
      type: String,
      enum: JOB_STATUS_VALUES,
      required: true,
      default: 'quote',
      index: true,
    },
    contractValue: { type: Number, default: 0, min: 0 },
    amountReceived: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, default: null },
    date: { type: Date, required: true, index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

bestInPrintJobSchema.index({ company: 1, date: -1 });
bestInPrintJobSchema.index({ printType: 1, status: 1 });

module.exports = mongoose.model('BestInPrintJob', bestInPrintJobSchema);
