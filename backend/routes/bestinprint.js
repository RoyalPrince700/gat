const express = require('express');
const BestInPrintJob = require('../models/BestInPrintJob');
const BestInPrintClient = require('../models/BestInPrintClient');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  PRINT_TYPES,
  JOB_STATUSES,
  CLIENT_TYPES,
  COLOUR_MODES,
  PAPER_TYPES,
  ACQUISITION_SOURCES,
  PRINT_TYPE_VALUES,
  JOB_STATUS_VALUES,
  COLOUR_MODE_VALUES,
  PAPER_TYPE_VALUES,
} = require('../utils/bestinprintMeta');

const router = express.Router();
const COMPANY_SLUG = 'best-in-print';

const getBestInPrintCompany = async () => Company.findOne({ slug: COMPANY_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === COMPANY_SLUG;
};

router.get('/meta', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Best In Print data' });
  }
  res.json({
    printTypes: PRINT_TYPES,
    jobStatuses: JOB_STATUSES,
    clientTypes: CLIENT_TYPES,
    colourModes: COLOUR_MODES,
    paperTypes: PAPER_TYPES,
    acquisitionSources: ACQUISITION_SOURCES,
  });
});

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best In Print data' });
    }

    const { from, to, client, status, printType } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (client) filter.client = client;
    if (status && JOB_STATUS_VALUES.includes(status)) {
      filter.status = status;
    }
    if (printType && PRINT_TYPE_VALUES.includes(printType)) {
      filter.printType = printType;
    }

    if (req.query.mine === '1' && !isMdOrAdmin(req.user)) {
      filter.createdBy = req.user._id;
    }

    const records = await BestInPrintJob.find(filter)
      .populate('createdBy', 'name email')
      .populate('client', 'name clientType contactName phone email')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best In Print data' });
    }

    const company = await getBestInPrintCompany();
    if (!company) {
      return res
        .status(404)
        .json({ message: 'Best In Print not found. Run seed.' });
    }

    const {
      clientId,
      clientName,
      contactName,
      phone,
      email,
      firstContactAt,
      joinedAt,
      clientType,
      title,
      printType,
      paperType,
      quantity,
      pages,
      colourMode,
      status,
      contractValue,
      amountReceived,
      dueDate,
      date,
      notes,
    } = req.body;

    if (!date || !title || !printType || !status) {
      return res.status(400).json({
        message: 'title, printType, status and date are required',
      });
    }

    if (!PRINT_TYPE_VALUES.includes(printType)) {
      return res.status(400).json({ message: 'Invalid printType' });
    }

    if (!JOB_STATUS_VALUES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (paperType && paperType !== '' && !PAPER_TYPE_VALUES.includes(paperType)) {
      return res.status(400).json({ message: 'Invalid paperType' });
    }

    if (
      colourMode &&
      colourMode !== '' &&
      !COLOUR_MODE_VALUES.includes(colourMode)
    ) {
      return res.status(400).json({ message: 'Invalid colourMode' });
    }

    let client;
    if (clientId) {
      client = await BestInPrintClient.findById(clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
    } else {
      if (!clientName) {
        return res.status(400).json({
          message: 'Select a client or provide clientName for a new client',
        });
      }
      client = await BestInPrintClient.create({
        company: company._id,
        createdBy: req.user._id,
        name: clientName,
        clientType: clientType || '',
        contactName: contactName || '',
        phone: phone || '',
        email: email || '',
        firstContactAt: firstContactAt || joinedAt || date || new Date(),
        notes: '',
      });
    }

    const record = await BestInPrintJob.create({
      company: company._id,
      createdBy: req.user._id,
      client: client._id,
      clientName: client.name,
      title,
      printType,
      paperType: paperType || '',
      quantity: Number(quantity) || 0,
      pages:
        pages === '' || pages == null || pages === undefined
          ? null
          : Number(pages),
      colourMode: colourMode || '',
      status,
      contractValue: Number(contractValue) || 0,
      amountReceived: Number(amountReceived) || 0,
      dueDate: dueDate || null,
      date,
      notes: notes || '',
    });

    const populated = await BestInPrintJob.findById(record._id)
      .populate('client', 'name clientType contactName phone email')
      .populate('createdBy', 'name email');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best In Print data' });
    }

    const record = await BestInPrintJob.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (req.body.clientId) {
      const client = await BestInPrintClient.findById(req.body.clientId);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      record.client = client._id;
      record.clientName = client.name;
    }

    if (
      req.body.printType !== undefined &&
      !PRINT_TYPE_VALUES.includes(req.body.printType)
    ) {
      return res.status(400).json({ message: 'Invalid printType' });
    }

    if (
      req.body.status !== undefined &&
      !JOB_STATUS_VALUES.includes(req.body.status)
    ) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (
      req.body.paperType !== undefined &&
      req.body.paperType !== '' &&
      !PAPER_TYPE_VALUES.includes(req.body.paperType)
    ) {
      return res.status(400).json({ message: 'Invalid paperType' });
    }

    if (
      req.body.colourMode !== undefined &&
      req.body.colourMode !== '' &&
      !COLOUR_MODE_VALUES.includes(req.body.colourMode)
    ) {
      return res.status(400).json({ message: 'Invalid colourMode' });
    }

    ['title', 'printType', 'paperType', 'colourMode', 'status', 'date', 'notes'].forEach(
      (field) => {
        if (req.body[field] !== undefined) {
          record[field] = req.body[field];
        }
      }
    );

    if (req.body.dueDate !== undefined) {
      record.dueDate = req.body.dueDate || null;
    }
    if (req.body.quantity !== undefined) {
      record.quantity = Number(req.body.quantity) || 0;
    }
    if (req.body.pages !== undefined) {
      record.pages =
        req.body.pages === '' || req.body.pages == null
          ? null
          : Number(req.body.pages);
    }
    if (req.body.contractValue !== undefined) {
      record.contractValue = Number(req.body.contractValue) || 0;
    }
    if (req.body.amountReceived !== undefined) {
      record.amountReceived = Number(req.body.amountReceived) || 0;
    }

    await record.save();

    const populated = await BestInPrintJob.findById(record._id)
      .populate('client', 'name clientType contactName phone email')
      .populate('createdBy', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best In Print data' });
    }

    const record = await BestInPrintJob.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json({ message: 'Job deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
