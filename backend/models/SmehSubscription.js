const mongoose = require('mongoose');

const smehSubscriptionSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmehSchool',
      required: true,
      index: true,
    },
    schoolName: { type: String, required: true, trim: true },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive'],
      required: true,
      default: 'active',
      index: true,
    },
    /** Only required when subscriptionStatus is active */
    amount: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    studentOnboarded: { type: Boolean, default: false },
    teacherOnboarded: { type: Boolean, default: false },
    parentOnboarded: { type: Boolean, default: false },
    /** Have they started using the platform */
    platformInUse: { type: Boolean, default: false },
    date: { type: Date, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

smehSubscriptionSchema.index({ company: 1, date: -1 });
smehSubscriptionSchema.index({ subscriptionStatus: 1, endsAt: 1 });

module.exports = mongoose.model('SmehSubscription', smehSubscriptionSchema);
