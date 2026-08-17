const express = require('express');
const TrifoneCustomer = require('../models/TrifoneCustomer');
const TrifoneSale = require('../models/TrifoneSale');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  CUSTOMER_TYPE_VALUES,
  ACQUISITION_SOURCE_VALUES,
} = require('../utils/trifoneMeta');

const router = express.Router();
const COMPANY_SLUG = 'trifone';

const getTrifoneCompany = async () => Company.findOne({ slug: COMPANY_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === COMPANY_SLUG;
};

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone customers' });
    }

    const customers = await TrifoneCustomer.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    const saleStats = await TrifoneSale.aggregate([
      {
        $group: {
          _id: '$customer',
          saleCount: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $ne: ['$status', 'cancelled'] },
                '$totalAmount',
                0,
              ],
            },
          },
          quantity: {
            $sum: {
              $cond: [
                { $ne: ['$status', 'cancelled'] },
                '$quantity',
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsByCustomer = new Map(
      saleStats.map((row) => [String(row._id), row])
    );

    const withStats = customers.map((customer) => {
      const stats = statsByCustomer.get(String(customer._id));
      return {
        ...customer.toObject(),
        saleCount: stats?.saleCount || 0,
        revenue: stats?.revenue || 0,
        quantity: stats?.quantity || 0,
      };
    });

    const overview = withStats.reduce(
      (acc, c) => {
        acc.totalCustomers += 1;
        acc.totalSales += c.saleCount;
        acc.totalRevenue += c.revenue;
        return acc;
      },
      { totalCustomers: 0, totalSales: 0, totalRevenue: 0 }
    );

    res.json({ customers: withStats, overview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone customers' });
    }

    const customer = await TrifoneCustomer.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const sales = await TrifoneSale.find({ customer: customer._id })
      .sort({ date: -1 })
      .populate('createdBy', 'name email');

    res.json({ customer, sales });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone customers' });
    }

    const company = await getTrifoneCompany();
    if (!company) {
      return res.status(404).json({ message: 'Trifone not found. Run seed.' });
    }

    const {
      name,
      customerType,
      contactName,
      phone,
      email,
      city,
      geoState,
      firstContactAt,
      acquisitionSource,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    if (
      customerType &&
      !CUSTOMER_TYPE_VALUES.includes(customerType)
    ) {
      return res.status(400).json({ message: 'Invalid customerType' });
    }

    if (
      acquisitionSource &&
      !ACQUISITION_SOURCE_VALUES.includes(acquisitionSource)
    ) {
      return res.status(400).json({ message: 'Invalid acquisitionSource' });
    }

    const customer = await TrifoneCustomer.create({
      company: company._id,
      createdBy: req.user._id,
      name,
      customerType: customerType || 'other',
      contactName: contactName || '',
      phone: phone || '',
      email: email || '',
      city: city || '',
      geoState: geoState || '',
      firstContactAt: firstContactAt || null,
      acquisitionSource: acquisitionSource || '',
      notes: notes || '',
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone customers' });
    }

    const customer = await TrifoneCustomer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (
      req.body.customerType !== undefined &&
      req.body.customerType !== '' &&
      !CUSTOMER_TYPE_VALUES.includes(req.body.customerType)
    ) {
      return res.status(400).json({ message: 'Invalid customerType' });
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
      'customerType',
      'contactName',
      'phone',
      'email',
      'city',
      'geoState',
      'acquisitionSource',
      'notes',
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        customer[field] = req.body[field];
      }
    });
    if (req.body.firstContactAt !== undefined) {
      customer.firstContactAt = req.body.firstContactAt || null;
    }

    await customer.save();

    if (req.body.name) {
      await TrifoneSale.updateMany(
        { customer: customer._id },
        { customerName: customer.name }
      );
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone customers' });
    }

    const customer = await TrifoneCustomer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await TrifoneSale.deleteMany({ customer: customer._id });

    res.json({ message: 'Customer and sales deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
