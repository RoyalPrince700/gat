const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    /** string | number | string[] depending on question type */
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const smipaySurveyResponseSchema = new mongoose.Schema(
  {
    survey: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SmipaySurvey',
      required: true,
      index: true,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
  },
  { timestamps: true }
);

smipaySurveyResponseSchema.index({ survey: 1, createdAt: -1 });

module.exports = mongoose.model('SmipaySurveyResponse', smipaySurveyResponseSchema);
