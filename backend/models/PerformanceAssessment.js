const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, default: '', trim: true },
    answer: { type: String, default: '', trim: true },
    metric: { type: String, default: '', trim: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { _id: false }
);

const performanceAssessmentSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    conductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    meetingDate: { type: Date, default: Date.now },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    department: { type: String, default: '', trim: true },
    questions: { type: [questionSchema], default: [] },
    totalScore: { type: Number, default: 0 },
    maxPossibleScore: { type: Number, default: 0 },
    scorePercent: { type: Number, default: 0 },
    overallNotes: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['draft', 'completed'],
      default: 'draft',
    },
  },
  { timestamps: true }
);

performanceAssessmentSchema.index({ staff: 1, meetingDate: -1 });
performanceAssessmentSchema.index({ status: 1 });
performanceAssessmentSchema.index({ department: 1 });
performanceAssessmentSchema.index({ company: 1 });

module.exports = mongoose.model(
  'PerformanceAssessment',
  performanceAssessmentSchema
);
