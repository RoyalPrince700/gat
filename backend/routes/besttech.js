const express = require('express');
const BesttechProject = require('../models/BesttechProject');
const BesttechClient = require('../models/BesttechClient');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  SERVICE_LINES,
  SERVICE_TYPES,
  PROJECT_STATUSES,
  ACQUISITION_SOURCES,
  SERVICE_LINE_VALUES,
  SERVICE_TYPE_VALUES,
  PROJECT_STATUS_VALUES,
  parseBool,
} = require('../utils/besttechMeta');

const router = express.Router();
const COMPANY_SLUG = 'best-technology-it';

const getBesttechCompany = async () => Company.findOne({ slug: COMPANY_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === COMPANY_SLUG;
};

router.get('/meta', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Best Technology IT data' });
  }
  res.json({
    serviceLines: SERVICE_LINES,
    serviceTypes: SERVICE_TYPES,
    projectStatuses: PROJECT_STATUSES,
    acquisitionSources: ACQUISITION_SOURCES,
  });
});

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best Technology IT data' });
    }

    const { from, to, client, status, serviceLine } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (client) filter.client = client;
    if (status && PROJECT_STATUS_VALUES.includes(status)) {
      filter.status = status;
    }
    if (serviceLine && SERVICE_LINE_VALUES.includes(serviceLine)) {
      filter.serviceLine = serviceLine;
    }

    // Non-admins only see their own records on "my records" style lists is optional;
    // company-wide for BestTech users (like SMEH) so team can collaborate.
    if (req.query.mine === '1' && !isMdOrAdmin(req.user)) {
      filter.createdBy = req.user._id;
    }

    const records = await BesttechProject.find(filter)
      .populate('createdBy', 'name email')
      .populate('client', 'name industry contactName phone email')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best Technology IT data' });
    }

    const company = await getBesttechCompany();
    if (!company) {
      return res
        .status(404)
        .json({ message: 'Best Technology IT not found. Run seed.' });
    }

    const {
      clientId,
      clientName,
      industry,
      contactName,
      phone,
      email,
      firstContactAt,
      title,
      serviceLine,
      serviceType,
      status,
      contractValue,
      amountReceived,
      startDate,
      endDate,
      date,
      deliverablesNote,
      isRetainer,
      notes,
    } = req.body;

    if (!date || !title || !serviceLine || !status) {
      return res.status(400).json({
        message: 'title, serviceLine, status and date are required',
      });
    }

    if (!SERVICE_LINE_VALUES.includes(serviceLine)) {
      return res.status(400).json({ message: 'Invalid serviceLine' });
    }

    const resolvedType = serviceType || 'other';
    if (!SERVICE_TYPE_VALUES.includes(resolvedType)) {
      return res.status(400).json({ message: 'Invalid serviceType' });
    }

    if (!PROJECT_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let client;
    if (clientId) {
      client = await BesttechClient.findById(clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
    } else {
      if (!clientName) {
        return res.status(400).json({
          message: 'Select a client or provide clientName for a new client',
        });
      }
      client = await BesttechClient.create({
        company: company._id,
        createdBy: req.user._id,
        name: clientName,
        industry: industry || '',
        contactName: contactName || '',
        phone: phone || '',
        email: email || '',
        firstContactAt: firstContactAt || date || new Date(),
        notes: '',
      });
    }

    const record = await BesttechProject.create({
      company: company._id,
      createdBy: req.user._id,
      client: client._id,
      clientName: client.name,
      title,
      serviceLine,
      serviceType: resolvedType,
      status,
      contractValue: Number(contractValue) || 0,
      amountReceived: Number(amountReceived) || 0,
      startDate: startDate || null,
      endDate: endDate || null,
      date,
      deliverablesNote: deliverablesNote || '',
      isRetainer: parseBool(isRetainer, false),
      notes: notes || '',
    });

    const populated = await BesttechProject.findById(record._id)
      .populate('client', 'name industry contactName phone email')
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best Technology IT data' });
    }

    const record = await BesttechProject.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (req.body.clientId) {
      const client = await BesttechClient.findById(req.body.clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      record.client = client._id;
      record.clientName = client.name;
    }

    if (
      req.body.serviceLine !== undefined &&
      !SERVICE_LINE_VALUES.includes(req.body.serviceLine)
    ) {
      return res.status(400).json({ message: 'Invalid serviceLine' });
    }

    if (
      req.body.serviceType !== undefined &&
      !SERVICE_TYPE_VALUES.includes(req.body.serviceType)
    ) {
      return res.status(400).json({ message: 'Invalid serviceType' });
    }

    if (
      req.body.status !== undefined &&
      !PROJECT_STATUS_VALUES.includes(req.body.status)
    ) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    [
      'title',
      'serviceLine',
      'serviceType',
      'status',
      'date',
      'deliverablesNote',
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
    if (req.body.isRetainer !== undefined) {
      record.isRetainer = parseBool(req.body.isRetainer, record.isRetainer);
    }

    await record.save();

    const populated = await BesttechProject.findById(record._id)
      .populate('client', 'name industry contactName phone email')
      .populate('createdBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best Technology IT data' });
    }

    const record = await BesttechProject.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
