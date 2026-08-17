const mongoose = require('mongoose');
const {
  PRODUCT_CATEGORY_VALUES,
  SALE_CHANNEL_VALUES,
  SALE_STATUS_VALUES,
  DESTINATION_VALUES,
} = require('../utils/trifoneMeta');

const trifoneSaleSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrifoneCustomer',
      required: true,
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    title: { type: String, default: '', trim: true },
    productCategory: {
      type: String,
      enum: PRODUCT_CATEGORY_VALUES,
      required: true,
      index: true,
    },
    productName: { type: String, default: '', trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    unitPrice: { type: Number, default: null, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    channel: {
      type: String,
      enum: SALE_CHANNEL_VALUES,
      required: true,
      default: 'retail',
    },
    status: {
      type: String,
      enum: SALE_STATUS_VALUES,
      required: true,
      default: 'confirmed',
      index: true,
    },
    date: { type: Date, required: true, index: true },
    destination: {
      type: String,
      enum: [...DESTINATION_VALUES, ''],
      default: '',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

trifoneSaleSchema.index({ company: 1, date: -1 });
trifoneSaleSchema.index({ productCategory: 1, status: 1 });

module.exports = mongoose.model('TrifoneSale', trifoneSaleSchema);
