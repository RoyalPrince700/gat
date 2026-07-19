const express = require('express');
const SmehSchool = require('../models/SmehSchool');
const SmehSubscription = require('../models/SmehSubscription');
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');

const router = express.Router();

const getSmehCompany = async () => Company.findOne({ slug: 'smart-edu-hub' });

const canAccess = (user) => {
  if (user.role === 'admin') return true;
  return user.company && user.company.slug === 'smart-edu-hub';
};

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH schools' });
    }

    const schools = await SmehSchool.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    const subStats = await SmehSubscription.aggregate([
      {
        $group: {
          _id: '$school',
          totalAmount: { $sum: '$amount' },
          subCount: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $eq: ['$subscriptionStatus', 'active'] }, 1, 0],
            },
          },
          latestEndsAt: { $max: '$endsAt' },
          anyPlatformInUse: { $max: { $cond: ['$platformInUse', 1, 0] } },
        },
      },
    ]);

    const statsBySchool = new Map(
      subStats.map((row) => [String(row._id), row])
    );

    const withStats = schools.map((school) => {
      const stats = statsBySchool.get(String(school._id));
      const activeCount = stats?.activeCount || 0;
      return {
        ...school.toObject(),
        totalAmount: stats?.totalAmount || 0,
        subCount: stats?.subCount || 0,
        activeCount,
        latestEndsAt: stats?.latestEndsAt || null,
        platformInUse: Boolean(stats?.anyPlatformInUse),
        lifecycle: activeCount > 0 ? 'subscribed' : 'aware',
      };
    });

    const overview = withStats.reduce(
      (acc, s) => {
        acc.totalSchools += 1;
        acc.totalAmount += s.totalAmount;
        acc.totalSubs += s.subCount;
        if (s.lifecycle === 'subscribed') acc.subscribed += 1;
        else acc.awareOnly += 1;
        if (s.platformInUse) acc.platformInUse += 1;
        return acc;
      },
      {
        totalSchools: 0,
        totalAmount: 0,
        totalSubs: 0,
        subscribed: 0,
        awareOnly: 0,
        platformInUse: 0,
      }
    );

    res.json({ schools: withStats, overview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH schools' });
    }

    const school = await SmehSchool.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    const subscriptions = await SmehSubscription.find({ school: school._id })
      .sort({ date: -1 })
      .populate('createdBy', 'name email');

    const activeCount = subscriptions.filter(
      (s) => s.subscriptionStatus === 'active'
    ).length;
    const totalAmount = subscriptions.reduce((sum, s) => sum + (s.amount || 0), 0);

    res.json({
      school: {
        ...school.toObject(),
        lifecycle: activeCount > 0 ? 'subscribed' : 'aware',
        totalAmount,
        subCount: subscriptions.length,
        activeCount,
      },
      subscriptions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH schools' });
    }

    const company = await getSmehCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smart Edu Hub not found. Run seed.' });
    }

    const { name, phone, email, awareAt, notes } = req.body;
    if (!name || !awareAt) {
      return res.status(400).json({ message: 'name and awareAt are required' });
    }

    const school = await SmehSchool.create({
      company: company._id,
      createdBy: req.user._id,
      name,
      phone: phone || '',
      email: email || '',
      awareAt,
      notes: notes || '',
    });

    res.status(201).json(school);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH schools' });
    }

    const school = await SmehSchool.findById(req.params.id);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    ['name', 'phone', 'email', 'awareAt', 'notes'].forEach((field) => {
      if (req.body[field] !== undefined) {
        school[field] = req.body[field];
      }
    });

    await school.save();

    if (req.body.name) {
      await SmehSubscription.updateMany(
        { school: school._id },
        { schoolName: school.name }
      );
    }

    res.json(school);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to SMEH schools' });
    }

    const school = await SmehSchool.findByIdAndDelete(req.params.id);
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    await SmehSubscription.deleteMany({ school: school._id });

    res.json({ message: 'School and subscriptions deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
