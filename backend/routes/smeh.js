const express = require('express');
const SmehSubscription = require('../models/SmehSubscription');
const SmehSchool = require('../models/SmehSchool');
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');
const {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_VALUES,
  parseBool,
} = require('../utils/smehMeta');

const router = express.Router();

const getSmehCompany = async () => Company.findOne({ slug: 'smart-edu-hub' });

const canAccess = (user) => {
  if (user.role === 'admin') return true;
  return user.company && user.company.slug === 'smart-edu-hub';
};

router.get('/meta', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to SMEH data' });
  }
  res.json({ subscriptionStatuses: SUBSCRIPTION_STATUSES });
});

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH data' });
    }

    const { from, to, school, status } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (school) filter.school = school;
    if (status && SUBSCRIPTION_STATUS_VALUES.includes(status)) {
      filter.subscriptionStatus = status;
    }

    const records = await SmehSubscription.find(filter)
      .populate('createdBy', 'name email')
      .populate('school', 'name phone email awareAt')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH data' });
    }

    const company = await getSmehCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smart Edu Hub not found. Run seed.' });
    }

    const {
      schoolId,
      schoolName,
      awareAt,
      phone,
      email,
      subscriptionStatus,
      amount,
      startedAt,
      endsAt,
      studentOnboarded,
      teacherOnboarded,
      parentOnboarded,
      platformInUse,
      date,
      notes,
    } = req.body;

    if (!date || !subscriptionStatus) {
      return res.status(400).json({
        message: 'subscriptionStatus and date are required',
      });
    }

    if (!SUBSCRIPTION_STATUS_VALUES.includes(subscriptionStatus)) {
      return res
        .status(400)
        .json({ message: 'subscriptionStatus must be active or inactive' });
    }

    const isActive = subscriptionStatus === 'active';

    if (isActive) {
      if (amount == null || amount === '' || !startedAt || !endsAt) {
        return res.status(400).json({
          message:
            'amount, startedAt and endsAt are required for active subscriptions',
        });
      }
      if (Number(amount) < 0 || Number.isNaN(Number(amount))) {
        return res.status(400).json({ message: 'amount must be a valid number' });
      }
      if (new Date(endsAt) < new Date(startedAt)) {
        return res
          .status(400)
          .json({ message: 'endsAt must be on or after startedAt' });
      }
    }

    let school;
    if (schoolId) {
      school = await SmehSchool.findById(schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
    } else {
      if (!schoolName) {
        return res.status(400).json({
          message: 'Select a school or provide schoolName for a new school',
        });
      }
      school = await SmehSchool.create({
        company: company._id,
        createdBy: req.user._id,
        name: schoolName,
        phone: phone || '',
        email: email || '',
        awareAt: awareAt || date || new Date(),
        notes: '',
      });
    }

    const record = await SmehSubscription.create({
      company: company._id,
      createdBy: req.user._id,
      school: school._id,
      schoolName: school.name,
      subscriptionStatus,
      amount: isActive ? Number(amount) : 0,
      startedAt: isActive ? startedAt : null,
      endsAt: isActive ? endsAt : null,
      studentOnboarded: isActive ? parseBool(studentOnboarded, false) : false,
      teacherOnboarded: isActive ? parseBool(teacherOnboarded, false) : false,
      parentOnboarded: isActive ? parseBool(parentOnboarded, false) : false,
      platformInUse: isActive ? parseBool(platformInUse, false) : false,
      date,
      notes: notes || '',
    });

    const populated = await SmehSubscription.findById(record._id)
      .populate('school', 'name phone email awareAt')
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH data' });
    }

    const record = await SmehSubscription.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    if (req.body.schoolId) {
      const school = await SmehSchool.findById(req.body.schoolId);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      record.school = school._id;
      record.schoolName = school.name;
    }

    if (
      req.body.subscriptionStatus !== undefined &&
      !SUBSCRIPTION_STATUS_VALUES.includes(req.body.subscriptionStatus)
    ) {
      return res
        .status(400)
        .json({ message: 'subscriptionStatus must be active or inactive' });
    }

    const nextStatus =
      req.body.subscriptionStatus !== undefined
        ? req.body.subscriptionStatus
        : record.subscriptionStatus;
    const isActive = nextStatus === 'active';

    if (isActive) {
      const nextAmount =
        req.body.amount !== undefined ? req.body.amount : record.amount;
      const nextStarted =
        req.body.startedAt !== undefined ? req.body.startedAt : record.startedAt;
      const nextEnds =
        req.body.endsAt !== undefined ? req.body.endsAt : record.endsAt;

      if (
        nextAmount == null ||
        nextAmount === '' ||
        !nextStarted ||
        !nextEnds
      ) {
        return res.status(400).json({
          message:
            'amount, startedAt and endsAt are required for active subscriptions',
        });
      }
      if (Number(nextAmount) < 0 || Number.isNaN(Number(nextAmount))) {
        return res.status(400).json({ message: 'amount must be a valid number' });
      }
      if (new Date(nextEnds) < new Date(nextStarted)) {
        return res
          .status(400)
          .json({ message: 'endsAt must be on or after startedAt' });
      }
    }

    if (req.body.date !== undefined) record.date = req.body.date;
    if (req.body.notes !== undefined) record.notes = req.body.notes;
    record.subscriptionStatus = nextStatus;

    if (isActive) {
      if (req.body.amount !== undefined) record.amount = Number(req.body.amount);
      if (req.body.startedAt !== undefined) record.startedAt = req.body.startedAt;
      if (req.body.endsAt !== undefined) record.endsAt = req.body.endsAt;
      ['studentOnboarded', 'teacherOnboarded', 'parentOnboarded', 'platformInUse'].forEach(
        (field) => {
          if (req.body[field] !== undefined) {
            record[field] = parseBool(req.body[field], record[field]);
          }
        }
      );
    } else {
      record.amount = 0;
      record.startedAt = null;
      record.endsAt = null;
      record.studentOnboarded = false;
      record.teacherOnboarded = false;
      record.parentOnboarded = false;
      record.platformInUse = false;
    }

    await record.save();

    const populated = await SmehSubscription.findById(record._id)
      .populate('school', 'name phone email awareAt')
      .populate('createdBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH data' });
    }

    const record = await SmehSubscription.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json({ message: 'Subscription deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
