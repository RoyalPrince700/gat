const mongoose = require('mongoose');
const {
  SMIPAY_CATEGORY_VALUES,
  SMIPAY_LEGACY_CATEGORIES,
} = require('../utils/smipayCategories');
const {
  TIME_OF_DAY_VALUES,
  AMOUNT_BUCKET_VALUES,
  applyAnalyticsBuckets,
} = require('../utils/smipayAnalyticsBuckets');
const {
  FAILURE_REASON_VALUES,
  PAYMENT_METHOD_VALUES,
} = require('../utils/smipayGrowthMeta');

const smipayRecordSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmipayCustomer',
      required: true,
    },
    customerName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [...SMIPAY_CATEGORY_VALUES, ...SMIPAY_LEGACY_CATEGORIES],
      required: true,
      default: 'other',
    },
    /** mtn | airtel | glo | 9mobile — for airtime/data */
    network: { type: String, default: null },
    /** Data size in GB (e.g. 0.5 = 500MB, 1.5 = 1.5GB) */
    dataSizeGb: { type: Number, min: 0, default: null },
    /** daily | 2_days | weekly | monthly | 3_months */
    dataPlanDuration: { type: String, default: null },
    dataPlanLabel: { type: String, default: '', trim: true },
    transactionCount: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    averageAmount: { type: Number, min: 0, default: 0 },
    date: { type: Date, required: true },
    /** morning | afternoon | evening | night — derived from date (Africa/Lagos) */
    timeOfDay: {
      type: String,
      enum: TIME_OF_DAY_VALUES,
      required: false,
      index: true,
    },
    /** under_100 | 100_500 | 500_1000 | 1000_2000 | 2000_plus */
    amountBucket: {
      type: String,
      enum: AMOUNT_BUCKET_VALUES,
      required: false,
      index: true,
    },
    channel: {
      type: String,
      enum: ['app', 'web', 'agent', 'ussd', 'other'],
      default: 'app',
    },
    /** Deposit funding method */
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHOD_VALUES,
      required: false,
    },
    /** Campaign / promo attribution code */
    promoCode: { type: String, default: '', trim: true, lowercase: true, index: true },
    /** Why a pending/failed txn failed */
    failureReason: {
      type: String,
      enum: FAILURE_REASON_VALUES,
      required: false,
    },
    /** Optional provider cost for margin (₦) */
    providerCost: { type: Number, min: 0, default: null },
    /** successful | pending | resolved */
    status: {
      type: String,
      enum: ['successful', 'pending', 'resolved'],
      default: 'successful',
      index: true,
    },
    resolvedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

smipayRecordSchema.pre('save', function setAnalyticsFields(next) {
  applyAnalyticsBuckets(this);
  next();
});

module.exports = mongoose.model('SmipayRecord', smipayRecordSchema);
