const mongoose = require('mongoose');

const eduRecordSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schoolName: { type: String, required: true, trim: true },
    newEnrollments: { type: Number, required: true, min: 0 },
    activeStudents: { type: Number, required: true, min: 0 },
    feesCollected: { type: Number, required: true, min: 0 },
    attendanceRate: { type: Number, min: 0, max: 100, default: 0 },
    date: { type: Date, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EduRecord', eduRecordSchema);
