const express = require('express');
const SmipayCustomer = require('../models/SmipayCustomer');
const SmipayRecord = require('../models/SmipayRecord');
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');
const {
  buildCustomerAnalysis,
  classifyBehavior,
  daysBetween,
} = require('../utils/smipayCustomerStats');
const {
  ACQUISITION_SOURCE_VALUES,
  GEO_STATES,
} = require('../utils/smipayGrowthMeta');

const router = express.Router();

const getSmipayCompany = async () => Company.findOne({ slug: 'smipay' });

const canAccess = (user) => {
  if (user.role === 'admin') return true;
  return user.company && user.company.slug === 'smipay';
};

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay customers' });
    }

    const customers = await SmipayCustomer.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    const volumeStats = await SmipayRecord.aggregate([
      {
        $group: {
          _id: '$customer',
          totalVolume: { $sum: '$totalAmount' },
          totalTransactions: { $sum: '$transactionCount' },
        },
      },
    ]);

    const statsByCustomer = new Map(
      volumeStats.map((row) => [String(row._id), row])
    );

    const withStats = customers.map((customer) => {
      const stats = statsByCustomer.get(String(customer._id));
      const totalVolume = stats?.totalVolume || 0;
      const totalTransactions = stats?.totalTransactions || 0;
      const daysSinceLastTxn = daysBetween(customer.lastTransactionAt);
      const behavior = classifyBehavior({
        totalTransactions,
        totalVolume,
        lastTransactionAt: customer.lastTransactionAt,
      });

      return {
        ...customer.toObject(),
        totalVolume,
        totalTransactions,
        daysSinceLastTxn,
        behavior,
      };
    });

    const overview = withStats.reduce(
      (acc, c) => {
        acc.totalCustomers += 1;
        acc.totalVolume += c.totalVolume;
        acc.totalTransactions += c.totalTransactions;
        acc.byBehavior[c.behavior] = (acc.byBehavior[c.behavior] || 0) + 1;
        if (c.totalTransactions === 0) acc.noTxn += 1;
        if (c.behavior === 'dormant') acc.dormant += 1;
        if (c.behavior === 'power_user') acc.powerUsers += 1;
        if (c.behavior === 'active') acc.active += 1;
        return acc;
      },
      {
        totalCustomers: 0,
        totalVolume: 0,
        totalTransactions: 0,
        noTxn: 0,
        dormant: 0,
        powerUsers: 0,
        active: 0,
        byBehavior: {},
      }
    );

    overview.averageVolume = overview.totalCustomers
      ? overview.totalVolume / overview.totalCustomers
      : 0;
    overview.averageTicket = overview.totalTransactions
      ? overview.totalVolume / overview.totalTransactions
      : 0;

    res.json({ customers: withStats, overview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay customers' });
    }

    const customer = await SmipayCustomer.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const analysis = await buildCustomerAnalysis(customer);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay customers' });
    }

    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found' });
    }

    const {
      name,
      phone,
      email,
      joinedAt,
      notes,
      status,
      acquisitionSource,
      geoState,
    } = req.body;
    if (!name || !joinedAt) {
      return res.status(400).json({ message: 'name and joinedAt are required' });
    }

    const customer = await SmipayCustomer.create({
      company: company._id,
      createdBy: req.user._id,
      name,
      phone: phone || '',
      email: email || '',
      joinedAt,
      acquisitionSource:
        acquisitionSource && ACQUISITION_SOURCE_VALUES.includes(acquisitionSource)
          ? acquisitionSource
          : 'organic',
      geoState: geoState && GEO_STATES.includes(geoState) ? geoState : 'Unknown',
      notes: notes || '',
      status: status || 'active',
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay customers' });
    }

    const customer = await SmipayCustomer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    ['name', 'phone', 'email', 'joinedAt', 'notes', 'status'].forEach((field) => {
      if (req.body[field] !== undefined) customer[field] = req.body[field];
    });

    if (req.body.acquisitionSource !== undefined) {
      if (
        req.body.acquisitionSource &&
        !ACQUISITION_SOURCE_VALUES.includes(req.body.acquisitionSource)
      ) {
        return res.status(400).json({ message: 'Invalid acquisition source' });
      }
      customer.acquisitionSource = req.body.acquisitionSource || 'organic';
    }
    if (req.body.geoState !== undefined) {
      if (req.body.geoState && !GEO_STATES.includes(req.body.geoState)) {
        return res.status(400).json({ message: 'Invalid geo state' });
      }
      customer.geoState = req.body.geoState || 'Unknown';
    }

    await customer.save();
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay customers' });
    }

    const customer = await SmipayCustomer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await SmipayRecord.deleteMany({ customer: customer._id });
    await customer.deleteOne();
    res.json({ message: 'Customer and related transactions deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
