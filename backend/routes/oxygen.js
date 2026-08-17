const express = require('express');
const OxygenBooking = require('../models/OxygenBooking');
const OxygenAdvertiser = require('../models/OxygenAdvertiser');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  BOOKING_TYPES,
  BOOKING_STATUSES,
  TIME_BELTS,
  ACQUISITION_SOURCES,
  BOOKING_TYPE_VALUES,
  BOOKING_STATUS_VALUES,
  TIME_BELT_VALUES,
  OXYGEN_SLUG,
} = require('../utils/oxygenMeta');

const router = express.Router();
const COMPANY_SLUG = OXYGEN_SLUG;

const getOxygenCompany = async () => Company.findOne({ slug: COMPANY_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === COMPANY_SLUG;
};

router.get('/meta', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Oxygen FM data' });
  }
  res.json({
    bookingTypes: BOOKING_TYPES,
    bookingStatuses: BOOKING_STATUSES,
    timeBelts: TIME_BELTS,
    acquisitionSources: ACQUISITION_SOURCES,
  });
});

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM data' });
    }

    const { from, to, advertiser, status, bookingType } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (advertiser) filter.advertiser = advertiser;
    if (status && BOOKING_STATUS_VALUES.includes(status)) {
      filter.status = status;
    }
    if (bookingType && BOOKING_TYPE_VALUES.includes(bookingType)) {
      filter.bookingType = bookingType;
    }

    if (req.query.mine === '1' && !isMdOrAdmin(req.user)) {
      filter.createdBy = req.user._id;
    }

    const records = await OxygenBooking.find(filter)
      .populate('createdBy', 'name email')
      .populate('advertiser', 'name industry contactName phone email')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM data' });
    }

    const company = await getOxygenCompany();
    if (!company) {
      return res.status(404).json({ message: 'Oxygen FM not found. Run seed.' });
    }

    const {
      advertiserId,
      advertiserName,
      industry,
      contactName,
      phone,
      email,
      firstContactAt,
      title,
      bookingType,
      status,
      contractValue,
      amountReceived,
      startDate,
      endDate,
      date,
      spotCount,
      durationSeconds,
      programme,
      timeBelt,
      notes,
    } = req.body;

    if (!date || !title || !bookingType || !status) {
      return res.status(400).json({
        message: 'title, bookingType, status and date are required',
      });
    }

    if (!BOOKING_TYPE_VALUES.includes(bookingType)) {
      return res.status(400).json({ message: 'Invalid bookingType' });
    }

    if (!BOOKING_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (timeBelt && !TIME_BELT_VALUES.includes(timeBelt)) {
      return res.status(400).json({ message: 'Invalid timeBelt' });
    }

    let advertiser;
    if (advertiserId) {
      advertiser = await OxygenAdvertiser.findById(advertiserId);
      if (!advertiser) {
        return res.status(404).json({ message: 'Advertiser not found' });
      }
    } else {
      if (!advertiserName) {
        return res.status(400).json({
          message: 'Select an advertiser or provide advertiserName for a new advertiser',
        });
      }
      advertiser = await OxygenAdvertiser.create({
        company: company._id,
        createdBy: req.user._id,
        name: advertiserName,
        industry: industry || '',
        contactName: contactName || '',
        phone: phone || '',
        email: email || '',
        firstContactAt: firstContactAt || date || new Date(),
        notes: '',
      });
    }

    const record = await OxygenBooking.create({
      company: company._id,
      createdBy: req.user._id,
      advertiser: advertiser._id,
      advertiserName: advertiser.name,
      title,
      bookingType,
      status,
      contractValue: Number(contractValue) || 0,
      amountReceived: Number(amountReceived) || 0,
      startDate: startDate || null,
      endDate: endDate || null,
      date,
      spotCount:
        spotCount === '' || spotCount === undefined || spotCount === null
          ? null
          : Number(spotCount),
      durationSeconds:
        durationSeconds === '' ||
        durationSeconds === undefined ||
        durationSeconds === null
          ? null
          : Number(durationSeconds),
      programme: programme || '',
      timeBelt: timeBelt || '',
      notes: notes || '',
    });

    const populated = await OxygenBooking.findById(record._id)
      .populate('advertiser', 'name industry contactName phone email')
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM data' });
    }

    const record = await OxygenBooking.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (req.body.advertiserId) {
      const advertiser = await OxygenAdvertiser.findById(req.body.advertiserId);
      if (!advertiser) {
        return res.status(404).json({ message: 'Advertiser not found' });
      }
      record.advertiser = advertiser._id;
      record.advertiserName = advertiser.name;
    }

    if (
      req.body.bookingType !== undefined &&
      !BOOKING_TYPE_VALUES.includes(req.body.bookingType)
    ) {
      return res.status(400).json({ message: 'Invalid bookingType' });
    }

    if (
      req.body.status !== undefined &&
      !BOOKING_STATUS_VALUES.includes(req.body.status)
    ) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (
      req.body.timeBelt !== undefined &&
      req.body.timeBelt !== '' &&
      !TIME_BELT_VALUES.includes(req.body.timeBelt)
    ) {
      return res.status(400).json({ message: 'Invalid timeBelt' });
    }

    [
      'title',
      'bookingType',
      'status',
      'date',
      'programme',
      'timeBelt',
      'notes',
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        record[field] = req.body[field];
      }
    });
    if (req.body.startDate !== undefined) {
      record.startDate = req.body.startDate || null;
    }
    if (req.body.endDate !== undefined) {
      record.endDate = req.body.endDate || null;
    }

    if (req.body.contractValue !== undefined) {
      record.contractValue = Number(req.body.contractValue) || 0;
    }
    if (req.body.amountReceived !== undefined) {
      record.amountReceived = Number(req.body.amountReceived) || 0;
    }
    if (req.body.spotCount !== undefined) {
      record.spotCount =
        req.body.spotCount === '' || req.body.spotCount === null
          ? null
          : Number(req.body.spotCount);
    }
    if (req.body.durationSeconds !== undefined) {
      record.durationSeconds =
        req.body.durationSeconds === '' || req.body.durationSeconds === null
          ? null
          : Number(req.body.durationSeconds);
    }

    await record.save();

    const populated = await OxygenBooking.findById(record._id)
      .populate('advertiser', 'name industry contactName phone email')
      .populate('createdBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Oxygen FM data' });
    }

    const record = await OxygenBooking.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
