const express = require('express');
const TrifoneSale = require('../models/TrifoneSale');
const TrifoneCustomer = require('../models/TrifoneCustomer');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  PRODUCT_CATEGORIES,
  SALE_CHANNELS,
  SALE_STATUSES,
  CUSTOMER_TYPES,
  ACQUISITION_SOURCES,
  DESTINATIONS,
  PRODUCT_CATEGORY_VALUES,
  SALE_CHANNEL_VALUES,
  SALE_STATUS_VALUES,
  DESTINATION_VALUES,
  WALK_IN_CUSTOMER_NAME,
} = require('../utils/trifoneMeta');

const router = express.Router();
const COMPANY_SLUG = 'trifone';

const getTrifoneCompany = async () => Company.findOne({ slug: COMPANY_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === COMPANY_SLUG;
};

const resolveOrCreateCustomer = async ({
  companyId,
  userId,
  customerId,
  customerName,
  customerType,
  contactName,
  phone,
  email,
  firstContactAt,
  walkIn,
  date,
}) => {
  if (customerId) {
    const existing = await TrifoneCustomer.findById(customerId);
    if (!existing) return { error: 'Customer not found' };
    return { customer: existing };
  }

  const name = walkIn ? WALK_IN_CUSTOMER_NAME : customerName;
  if (!name) {
    return {
      error: 'Select a customer, provide customerName, or use walk-in',
    };
  }

  if (walkIn) {
    let walkInCustomer = await TrifoneCustomer.findOne({
      company: companyId,
      name: WALK_IN_CUSTOMER_NAME,
    });
    if (!walkInCustomer) {
      walkInCustomer = await TrifoneCustomer.create({
        company: companyId,
        createdBy: userId,
        name: WALK_IN_CUSTOMER_NAME,
        customerType: 'end_consumer',
        firstContactAt: firstContactAt || date || new Date(),
        notes: 'System walk-in / general retail sales',
      });
    }
    return { customer: walkInCustomer };
  }

  const customer = await TrifoneCustomer.create({
    company: companyId,
    createdBy: userId,
    name,
    customerType: customerType || 'other',
    contactName: contactName || '',
    phone: phone || '',
    email: email || '',
    firstContactAt: firstContactAt || date || new Date(),
    notes: '',
  });
  return { customer };
};

router.get('/meta', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Trifone data' });
  }
  res.json({
    productCategories: PRODUCT_CATEGORIES,
    channels: SALE_CHANNELS,
    saleStatuses: SALE_STATUSES,
    customerTypes: CUSTOMER_TYPES,
    acquisitionSources: ACQUISITION_SOURCES,
    destinations: DESTINATIONS,
  });
});

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone data' });
    }

    const { from, to, customer, status, productCategory, channel } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (customer) filter.customer = customer;
    if (status && SALE_STATUS_VALUES.includes(status)) {
      filter.status = status;
    }
    if (productCategory && PRODUCT_CATEGORY_VALUES.includes(productCategory)) {
      filter.productCategory = productCategory;
    }
    if (channel && SALE_CHANNEL_VALUES.includes(channel)) {
      filter.channel = channel;
    }

    if (req.query.mine === '1' && !isMdOrAdmin(req.user)) {
      filter.createdBy = req.user._id;
    }

    const records = await TrifoneSale.find(filter)
      .populate('createdBy', 'name email')
      .populate('customer', 'name customerType contactName phone email')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone data' });
    }

    const company = await getTrifoneCompany();
    if (!company) {
      return res.status(404).json({ message: 'Trifone not found. Run seed.' });
    }

    const {
      customerId,
      customerName,
      customerType,
      contactName,
      phone,
      email,
      firstContactAt,
      walkIn,
      title,
      productCategory,
      productName,
      quantity,
      unitPrice,
      totalAmount,
      channel,
      status,
      date,
      destination,
      notes,
    } = req.body;

    if (!date || !productCategory || totalAmount === undefined || totalAmount === '') {
      return res.status(400).json({
        message: 'productCategory, totalAmount and date are required',
      });
    }

    if (!PRODUCT_CATEGORY_VALUES.includes(productCategory)) {
      return res.status(400).json({ message: 'Invalid productCategory' });
    }

    const resolvedChannel = channel || 'retail';
    if (!SALE_CHANNEL_VALUES.includes(resolvedChannel)) {
      return res.status(400).json({ message: 'Invalid channel' });
    }

    const resolvedStatus = status || 'confirmed';
    if (!SALE_STATUS_VALUES.includes(resolvedStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (
      destination &&
      !DESTINATION_VALUES.includes(destination)
    ) {
      return res.status(400).json({ message: 'Invalid destination' });
    }

    const resolved = await resolveOrCreateCustomer({
      companyId: company._id,
      userId: req.user._id,
      customerId,
      customerName,
      customerType,
      contactName,
      phone,
      email,
      firstContactAt,
      walkIn: walkIn === true || walkIn === 'true' || walkIn === 1 || walkIn === '1',
      date,
    });

    if (resolved.error) {
      return res.status(resolved.error === 'Customer not found' ? 404 : 400).json({
        message: resolved.error,
      });
    }

    const { customer } = resolved;

    const qty = Number(quantity) || 0;
    const amount = Number(totalAmount);
    if (Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: 'totalAmount must be a non-negative number' });
    }

    const record = await TrifoneSale.create({
      company: company._id,
      createdBy: req.user._id,
      customer: customer._id,
      customerName: customer.name,
      title: title || '',
      productCategory,
      productName: productName || '',
      quantity: qty,
      unitPrice:
        unitPrice === undefined || unitPrice === null || unitPrice === ''
          ? null
          : Number(unitPrice) || 0,
      totalAmount: amount,
      channel: resolvedChannel,
      status: resolvedStatus,
      date,
      destination: destination || '',
      notes: notes || '',
    });

    const populated = await TrifoneSale.findById(record._id)
      .populate('customer', 'name customerType contactName phone email')
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone data' });
    }

    const record = await TrifoneSale.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    if (req.body.customerId) {
      const customer = await TrifoneCustomer.findById(req.body.customerId);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      record.customer = customer._id;
      record.customerName = customer.name;
    }

    if (
      req.body.productCategory !== undefined &&
      !PRODUCT_CATEGORY_VALUES.includes(req.body.productCategory)
    ) {
      return res.status(400).json({ message: 'Invalid productCategory' });
    }

    if (
      req.body.channel !== undefined &&
      !SALE_CHANNEL_VALUES.includes(req.body.channel)
    ) {
      return res.status(400).json({ message: 'Invalid channel' });
    }

    if (
      req.body.status !== undefined &&
      !SALE_STATUS_VALUES.includes(req.body.status)
    ) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (
      req.body.destination !== undefined &&
      req.body.destination !== '' &&
      !DESTINATION_VALUES.includes(req.body.destination)
    ) {
      return res.status(400).json({ message: 'Invalid destination' });
    }

    [
      'title',
      'productCategory',
      'productName',
      'channel',
      'status',
      'date',
      'destination',
      'notes',
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        record[field] = req.body[field];
      }
    });

    if (req.body.quantity !== undefined) {
      record.quantity = Number(req.body.quantity) || 0;
    }
    if (req.body.unitPrice !== undefined) {
      record.unitPrice =
        req.body.unitPrice === null || req.body.unitPrice === ''
          ? null
          : Number(req.body.unitPrice) || 0;
    }
    if (req.body.totalAmount !== undefined) {
      record.totalAmount = Number(req.body.totalAmount) || 0;
    }

    await record.save();

    const populated = await TrifoneSale.findById(record._id)
      .populate('customer', 'name customerType contactName phone email')
      .populate('createdBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Trifone data' });
    }

    const record = await TrifoneSale.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json({ message: 'Sale deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
