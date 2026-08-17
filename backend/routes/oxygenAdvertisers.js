const express = require('express');
const OxygenAdvertiser = require('../models/OxygenAdvertiser');
const OxygenBooking = require('../models/OxygenBooking');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  ACQUISITION_SOURCE_VALUES,
  OXYGEN_SLUG,
} = require('../utils/oxygenMeta');

const router = express.Router();
const COMPANY_SLUG = OXYGEN_SLUG;

const getOxygenCompany = async () => Company.findOne({ slug: COMPANY_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === COMPANY_SLUG;
};

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM advertisers' });
    }

    const advertisers = await OxygenAdvertiser.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    const bookingStats = await OxygenBooking.aggregate([
      {
        $group: {
          _id: '$advertiser',
          bookingCount: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['booked', 'running', 'proposal']] },
                1,
                0,
              ],
            },
          },
          contractValue: { $sum: '$contractValue' },
        },
      },
    ]);

    const statsByAdvertiser = new Map(
      bookingStats.map((row) => [String(row._id), row])
    );

    const withStats = advertisers.map((advertiser) => {
      const stats = statsByAdvertiser.get(String(advertiser._id));
      return {
        ...advertiser.toObject(),
        bookingCount: stats?.bookingCount || 0,
        activeCount: stats?.activeCount || 0,
        contractValue: stats?.contractValue || 0,
      };
    });

    const overview = withStats.reduce(
      (acc, a) => {
        acc.totalAdvertisers += 1;
        acc.totalBookings += a.bookingCount;
        acc.pipelineValue += a.contractValue;
        return acc;
      },
      { totalAdvertisers: 0, totalBookings: 0, pipelineValue: 0 }
    );

    res.json({ advertisers: withStats, overview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM advertisers' });
    }

    const advertiser = await OxygenAdvertiser.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );
    if (!advertiser) {
      return res.status(404).json({ message: 'Advertiser not found' });
    }

    const bookings = await OxygenBooking.find({ advertiser: advertiser._id })
      .sort({ date: -1 })
      .populate('createdBy', 'name email');

    res.json({ advertiser, bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM advertisers' });
    }

    const company = await getOxygenCompany();
    if (!company) {
      return res.status(404).json({ message: 'Oxygen FM not found. Run seed.' });
    }

    const {
      name,
      industry,
      contactName,
      phone,
      email,
      firstContactAt,
      acquisitionSource,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    if (
      acquisitionSource &&
      !ACQUISITION_SOURCE_VALUES.includes(acquisitionSource)
    ) {
      return res.status(400).json({ message: 'Invalid acquisitionSource' });
    }

    const advertiser = await OxygenAdvertiser.create({
      company: company._id,
      createdBy: req.user._id,
      name,
      industry: industry || '',
      contactName: contactName || '',
      phone: phone || '',
      email: email || '',
      firstContactAt: firstContactAt || null,
      acquisitionSource: acquisitionSource || '',
      notes: notes || '',
    });

    res.status(201).json(advertiser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM advertisers' });
    }

    const advertiser = await OxygenAdvertiser.findById(req.params.id);
    if (!advertiser) {
      return res.status(404).json({ message: 'Advertiser not found' });
    }

    if (
      req.body.acquisitionSource !== undefined &&
      req.body.acquisitionSource !== '' &&
      !ACQUISITION_SOURCE_VALUES.includes(req.body.acquisitionSource)
    ) {
      return res.status(400).json({ message: 'Invalid acquisitionSource' });
    }

    [
      'name',
      'industry',
      'contactName',
      'phone',
      'email',
      'acquisitionSource',
      'notes',
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        advertiser[field] = req.body[field];
      }
    });
    if (req.body.firstContactAt !== undefined) {
      advertiser.firstContactAt = req.body.firstContactAt || null;
    }

    await advertiser.save();

    if (req.body.name) {
      await OxygenBooking.updateMany(
        { advertiser: advertiser._id },
        { advertiserName: advertiser.name }
      );
    }

    res.json(advertiser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM advertisers' });
    }

    const advertiser = await OxygenAdvertiser.findByIdAndDelete(req.params.id);
    if (!advertiser) {
      return res.status(404).json({ message: 'Advertiser not found' });
    }

    await OxygenBooking.deleteMany({ advertiser: advertiser._id });

    res.json({ message: 'Advertiser and bookings deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
