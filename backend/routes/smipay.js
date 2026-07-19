const express = require('express');
const SmipayRecord = require('../models/SmipayRecord');
const SmipayCustomer = require('../models/SmipayCustomer');
const Company = require('../models/Company');
const { protect } = require('../middleware/auth');
const { SMIPAY_CATEGORY_VALUES, SMIPAY_CATEGORIES } = require('../utils/smipayCategories');
const {
  SMIPAY_NETWORKS,
  SMIPAY_NETWORK_VALUES,
  SMIPAY_DATA_PLANS,
  SMIPAY_DATA_DURATIONS,
  SMIPAY_DATA_DURATION_VALUES,
  SMIPAY_STATUS_VALUES,
  SMIPAY_CREATE_STATUS_VALUES,
  NETWORK_CATEGORIES,
  buildDataPlanLabel,
} = require('../utils/smipayNetworks');
const { syncCustomerTransactionDates } = require('../utils/smipayCustomerStats');
const {
  ACQUISITION_SOURCES,
  ACQUISITION_SOURCE_VALUES,
  FAILURE_REASONS,
  FAILURE_REASON_VALUES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  GEO_STATES,
} = require('../utils/smipayGrowthMeta');

const router = express.Router();

const normalizePromo = (code) =>
  String(code || '')
    .trim()
    .toLowerCase();

const getSmipayCompany = async () => Company.findOne({ slug: 'smipay' });

const canAccess = (user) => {
  if (user.role === 'admin') return true;
  return user.company && user.company.slug === 'smipay';
};

const resolveNetworkFields = ({
  category,
  network,
  dataSizeGb,
  dataPlanDuration,
  dataPlanLabel,
}) => {
  if (!NETWORK_CATEGORIES.includes(category)) {
    return {
      network: null,
      dataSizeGb: null,
      dataPlanDuration: null,
      dataPlanLabel: '',
    };
  }

  if (!network || !SMIPAY_NETWORK_VALUES.includes(network)) {
    return { error: 'Select a network (MTN, Airtel, Glo, or 9mobile)' };
  }

  if (category !== 'data') {
    return {
      network,
      dataSizeGb: null,
      dataPlanDuration: null,
      dataPlanLabel: '',
    };
  }

  const size = Number(dataSizeGb);
  if (dataSizeGb == null || dataSizeGb === '' || Number.isNaN(size) || size <= 0) {
    return { error: 'Select or enter a data plan size (GB)' };
  }

  if (
    !dataPlanDuration ||
    !SMIPAY_DATA_DURATION_VALUES.includes(dataPlanDuration)
  ) {
    return {
      error: 'Select data plan validity (Daily, 2 days, Weekly, Monthly, or 3 months)',
    };
  }

  return {
    network,
    dataSizeGb: size,
    dataPlanDuration,
    dataPlanLabel: dataPlanLabel || buildDataPlanLabel(size, dataPlanDuration),
  };
};

router.get('/meta/categories', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Smipay data' });
  }
  res.json(SMIPAY_CATEGORIES);
});

router.get('/meta/networks', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Smipay data' });
  }
  res.json({
    networks: SMIPAY_NETWORKS,
    dataPlans: SMIPAY_DATA_PLANS,
    dataDurations: SMIPAY_DATA_DURATIONS,
  });
});

router.get('/meta/growth', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Smipay data' });
  }
  res.json({
    acquisitionSources: ACQUISITION_SOURCES,
    failureReasons: FAILURE_REASONS,
    paymentMethods: PAYMENT_METHODS,
    geoStates: GEO_STATES,
  });
});

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const { from, to, category, customer } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (category) filter.category = category;
    if (customer) filter.customer = customer;

    const records = await SmipayRecord.find(filter)
      .populate('createdBy', 'name email')
      .populate('customer', 'name phone email joinedAt firstTransactionAt lastTransactionAt')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found. Run seed.' });
    }

    const {
      customerId,
      customerName,
      joinedAt,
      phone,
      email,
      acquisitionSource,
      geoState,
      category,
      network,
      dataSizeGb,
      dataPlanDuration,
      dataPlanLabel,
      transactionCount,
      totalAmount,
      averageAmount,
      date,
      channel,
      status,
      notes,
      paymentMethod,
      promoCode,
      failureReason,
      providerCost,
    } = req.body;

    if (transactionCount == null || totalAmount == null || !date || !category) {
      return res.status(400).json({
        message: 'category, transactionCount, totalAmount and date are required',
      });
    }

    if (!SMIPAY_CATEGORY_VALUES.includes(category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const nextStatus = status || 'successful';
    if (!SMIPAY_CREATE_STATUS_VALUES.includes(nextStatus)) {
      return res.status(400).json({
        message: 'Status must be successful or pending when creating',
      });
    }

    const networkFields = resolveNetworkFields({
      category,
      network,
      dataSizeGb,
      dataPlanDuration,
      dataPlanLabel,
    });
    if (networkFields.error) {
      return res.status(400).json({ message: networkFields.error });
    }

    let customer;
    if (customerId) {
      customer = await SmipayCustomer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
    } else {
      if (!customerName || !joinedAt) {
        return res.status(400).json({
          message: 'Select a customer or provide customerName and joinedAt',
        });
      }
      const src =
        acquisitionSource && ACQUISITION_SOURCE_VALUES.includes(acquisitionSource)
          ? acquisitionSource
          : 'organic';
      const state =
        geoState && GEO_STATES.includes(geoState) ? geoState : 'Unknown';
      customer = await SmipayCustomer.create({
        company: company._id,
        createdBy: req.user._id,
        name: customerName,
        phone: phone || '',
        email: email || '',
        joinedAt,
        acquisitionSource: src,
        geoState: state,
        notes: '',
      });
    }

    if (
      paymentMethod &&
      category === 'deposit' &&
      !PAYMENT_METHOD_VALUES.includes(paymentMethod)
    ) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }
    if (failureReason && !FAILURE_REASON_VALUES.includes(failureReason)) {
      return res.status(400).json({ message: 'Invalid failure reason' });
    }

    const record = await SmipayRecord.create({
      company: company._id,
      createdBy: req.user._id,
      customer: customer._id,
      customerName: customer.name,
      category,
      network: networkFields.network,
      dataSizeGb: networkFields.dataSizeGb,
      dataPlanDuration: networkFields.dataPlanDuration,
      dataPlanLabel: networkFields.dataPlanLabel,
      transactionCount,
      totalAmount,
      averageAmount:
        averageAmount ??
        (transactionCount > 0 ? totalAmount / transactionCount : 0),
      date,
      channel: channel || 'app',
      paymentMethod:
        category === 'deposit' && paymentMethod ? paymentMethod : undefined,
      promoCode: normalizePromo(promoCode),
      failureReason:
        nextStatus === 'pending' && failureReason ? failureReason : undefined,
      providerCost:
        providerCost != null && providerCost !== ''
          ? Number(providerCost)
          : null,
      status: nextStatus,
      resolvedAt: null,
      notes: notes || '',
    });

    await syncCustomerTransactionDates(customer._id);

    const populated = await SmipayRecord.findById(record._id)
      .populate('customer', 'name phone email joinedAt firstTransactionAt lastTransactionAt');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const record = await SmipayRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const prevCustomerId = record.customer;

    if (req.body.customerId) {
      const customer = await SmipayCustomer.findById(req.body.customerId);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      record.customer = customer._id;
      record.customerName = customer.name;
    }

    const fields = [
      'category',
      'transactionCount',
      'totalAmount',
      'averageAmount',
      'date',
      'channel',
      'notes',
      'promoCode',
      'providerCost',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'promoCode') {
          record[field] = normalizePromo(req.body[field]);
        } else if (field === 'providerCost') {
          record[field] =
            req.body[field] === '' || req.body[field] == null
              ? null
              : Number(req.body[field]);
        } else {
          record[field] = req.body[field];
        }
      }
    });

    if (req.body.paymentMethod !== undefined) {
      const nextCat = req.body.category || record.category;
      if (nextCat === 'deposit') {
        if (
          req.body.paymentMethod &&
          !PAYMENT_METHOD_VALUES.includes(req.body.paymentMethod)
        ) {
          return res.status(400).json({ message: 'Invalid payment method' });
        }
        record.paymentMethod = req.body.paymentMethod || undefined;
      } else {
        record.paymentMethod = undefined;
      }
    }

    if (req.body.failureReason !== undefined) {
      if (
        req.body.failureReason &&
        !FAILURE_REASON_VALUES.includes(req.body.failureReason)
      ) {
        return res.status(400).json({ message: 'Invalid failure reason' });
      }
      record.failureReason = req.body.failureReason || undefined;
    }

    const nextCategory = record.category;
    const networkFields = resolveNetworkFields({
      category: nextCategory,
      network:
        req.body.network !== undefined ? req.body.network : record.network,
      dataSizeGb:
        req.body.dataSizeGb !== undefined
          ? req.body.dataSizeGb
          : record.dataSizeGb,
      dataPlanDuration:
        req.body.dataPlanDuration !== undefined
          ? req.body.dataPlanDuration
          : record.dataPlanDuration,
      dataPlanLabel:
        req.body.dataPlanLabel !== undefined
          ? req.body.dataPlanLabel
          : record.dataPlanLabel,
    });
    if (networkFields.error) {
      return res.status(400).json({ message: networkFields.error });
    }

    record.network = networkFields.network;
    record.dataSizeGb = networkFields.dataSizeGb;
    record.dataPlanDuration = networkFields.dataPlanDuration;
    record.dataPlanLabel = networkFields.dataPlanLabel;

    if (req.body.status !== undefined) {
      if (!SMIPAY_STATUS_VALUES.includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      const prevStatus = record.status || 'successful';
      record.status = req.body.status;
      if (req.body.status === 'resolved' && prevStatus !== 'resolved') {
        record.resolvedAt = new Date();
      }
      if (req.body.status !== 'resolved') {
        record.resolvedAt = null;
      }
    }

    if (record.transactionCount > 0) {
      record.averageAmount = record.totalAmount / record.transactionCount;
    }

    await record.save();
    await syncCustomerTransactionDates(record.customer);
    if (String(prevCustomerId) !== String(record.customer)) {
      await syncCustomerTransactionDates(prevCustomerId);
    }

    const populated = await SmipayRecord.findById(record._id)
      .populate('customer', 'name phone email joinedAt firstTransactionAt lastTransactionAt');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/resolve', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const record = await SmipayRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if ((record.status || 'successful') !== 'pending') {
      return res.status(400).json({ message: 'Only pending transactions can be resolved' });
    }

    record.status = 'resolved';
    record.resolvedAt = new Date();
    await record.save();

    const populated = await SmipayRecord.findById(record._id)
      .populate('customer', 'name phone email joinedAt firstTransactionAt lastTransactionAt')
      .populate('createdBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay data' });
    }

    const record = await SmipayRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const customerId = record.customer;
    await record.deleteOne();
    await syncCustomerTransactionDates(customerId);

    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
