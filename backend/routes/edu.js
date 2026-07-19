const express = require('express');
const EduRecord = require('../models/EduRecord');
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');

const router = express.Router();

const getEduCompany = async () => Company.findOne({ slug: 'smart-edu-hub' });

const canAccess = (user) => {
  if (user.role === 'admin') return true;
  return user.company && user.company.slug === 'smart-edu-hub';
};

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smart Edu Hub data' });
    }

    const { from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const records = await EduRecord.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smart Edu Hub data' });
    }

    const company = await getEduCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smart Edu Hub not found. Run seed.' });
    }

    const {
      schoolName,
      newEnrollments,
      activeStudents,
      feesCollected,
      attendanceRate,
      date,
      notes,
    } = req.body;

    if (
      !schoolName ||
      newEnrollments == null ||
      activeStudents == null ||
      feesCollected == null ||
      !date
    ) {
      return res.status(400).json({
        message:
          'schoolName, newEnrollments, activeStudents, feesCollected and date are required',
      });
    }

    const record = await EduRecord.create({
      company: company._id,
      createdBy: req.user._id,
      schoolName,
      newEnrollments,
      activeStudents,
      feesCollected,
      attendanceRate: attendanceRate ?? 0,
      date,
      notes: notes || '',
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smart Edu Hub data' });
    }

    const record = await EduRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const fields = [
      'schoolName',
      'newEnrollments',
      'activeStudents',
      'feesCollected',
      'attendanceRate',
      'date',
      'notes',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        record[field] = req.body[field];
      }
    });

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smart Edu Hub data' });
    }

    const record = await EduRecord.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
