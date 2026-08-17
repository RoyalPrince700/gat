const mongoose = require('mongoose');
const {
  BOOKING_TYPE_VALUES,
  BOOKING_STATUS_VALUES,
  TIME_BELT_VALUES,
} = require('../utils/oxygenMeta');

const oxygenBookingSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    advertiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OxygenAdvertiser',
      required: true,
      index: true,
    },
    advertiserName: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    bookingType: {
      type: String,
      enum: BOOKING_TYPE_VALUES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: BOOKING_STATUS_VALUES,
      required: true,
      default: 'lead',
      index: true,
    },
    contractValue: { type: Number, default: 0, min: 0 },
    amountReceived: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    date: { type: Date, required: true, index: true },
    spotCount: { type: Number, default: null, min: 0 },
    durationSeconds: { type: Number, default: null, min: 0 },
    programme: { type: String, default: '', trim: true },
    timeBelt: {
      type: String,
      enum: [...TIME_BELT_VALUES, ''],
      default: '',
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

oxygenBookingSchema.index({ company: 1, date: -1 });
oxygenBookingSchema.index({ bookingType: 1, status: 1 });

module.exports = mongoose.model('OxygenBooking', oxygenBookingSchema);
