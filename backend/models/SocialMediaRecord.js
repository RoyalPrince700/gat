const mongoose = require('mongoose');
const { SOCIAL_MEDIA_PLATFORM_VALUES } = require('../utils/socialMediaPlatforms');

const socialMediaRecordSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    platform: {
      type: String,
      enum: SOCIAL_MEDIA_PLATFORM_VALUES,
      required: true,
    },
    newFollowers: { type: Number, required: true, min: 0 },
    totalFollowers: { type: Number, min: 0, default: null },
    date: { type: Date, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

socialMediaRecordSchema.index(
  { company: 1, platform: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model('SocialMediaRecord', socialMediaRecordSchema);
