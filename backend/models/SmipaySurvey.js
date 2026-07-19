const mongoose = require('mongoose');

const QUESTION_TYPES = [
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'rating',
  'yes_no',
];

const surveyQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: QUESTION_TYPES,
      required: true,
    },
    label: { type: String, required: true, trim: true },
    required: { type: Boolean, default: true },
    options: {
      type: [String],
      default: undefined,
    },
    /** For rating questions: max stars (2–10), default 5 */
    maxRating: { type: Number, min: 2, max: 10 },
  },
  { _id: false }
);

const smipaySurveySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'active',
      index: true,
    },
    questions: {
      type: [surveyQuestionSchema],
      default: [],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Survey must have at least one question',
      },
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

smipaySurveySchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('SmipaySurvey', smipaySurveySchema);
module.exports.QUESTION_TYPES = QUESTION_TYPES;
