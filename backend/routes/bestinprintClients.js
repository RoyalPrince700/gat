const express = require('express');
const BestInPrintClient = require('../models/BestInPrintClient');
const BestInPrintJob = require('../models/BestInPrintJob');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  ACQUISITION_SOURCE_VALUES,
  CLIENT_TYPE_VALUES,
} = require('../utils/bestinprintMeta');

const router = express.Router();
const COMPANY_SLUG = 'best-in-print';

const getBestInPrintCompany = async () => Company.findOne({ slug: COMPANY_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === COMPANY_SLUG;
};

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Best In Print clients' });
    }

    const clients = await BestInPrintClient.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    const jobStats = await BestInPrintJob.aggregate([
      {
        $group: {
          _id: '$client',
          jobCount: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$status',
                    ['quote', 'confirmed', 'in_production', 'ready'],
                  ],
                },
                1,
                0,
              ],
            },
          },
          contractValue: { $sum: '$contractValue' },
        },
      },
    ]);

    const statsByClient = new Map(
      jobStats.map((row) => [String(row._id), row])
    );

    const withStats = clients.map((client) => {
      const stats = statsByClient.get(String(client._id));
      return {
        ...client.toObject(),
        jobCount: stats?.jobCount || 0,
        activeCount: stats?.activeCount || 0,
        contractValue: stats?.contractValue || 0,
      };
    });

    const overview = withStats.reduce(
      (acc, c) => {
        acc.totalClients += 1;
        acc.totalJobs += c.jobCount;
        acc.pipelineValue += c.contractValue;
        return acc;
      },
      { totalClients: 0, totalJobs: 0, pipelineValue: 0 }
    );

    res.json({ clients: withStats, overview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Best In Print clients' });
    }

    const client = await BestInPrintClient.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const jobs = await BestInPrintJob.find({ client: client._id })
      .sort({ date: -1 })
      .populate('createdBy', 'name email');

    res.json({ client, jobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Best In Print clients' });
    }

    const company = await getBestInPrintCompany();
    if (!company) {
      return res
        .status(404)
        .json({ message: 'Best In Print not found. Run seed.' });
    }

    const {
      name,
      clientType,
      contactName,
      phone,
      email,
      geoState,
      city,
      firstContactAt,
      joinedAt,
      acquisitionSource,
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'name is required' });
    }

    if (
      clientType &&
      clientType !== '' &&
      !CLIENT_TYPE_VALUES.includes(clientType)
    ) {
      return res.status(400).json({ message: 'Invalid clientType' });
    }

    if (
      acquisitionSource &&
      !ACQUISITION_SOURCE_VALUES.includes(acquisitionSource)
    ) {
      return res.status(400).json({ message: 'Invalid acquisitionSource' });
    }

    const client = await BestInPrintClient.create({
      company: company._id,
      createdBy: req.user._id,
      name,
      clientType: clientType || '',
      contactName: contactName || '',
      phone: phone || '',
      email: email || '',
      geoState: geoState || '',
      city: city || '',
      firstContactAt: firstContactAt || joinedAt || null,
      acquisitionSource: acquisitionSource || '',
      notes: notes || '',
    });

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Best In Print clients' });
    }

    const client = await BestInPrintClient.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    if (
      req.body.clientType !== undefined &&
      req.body.clientType !== '' &&
      !CLIENT_TYPE_VALUES.includes(req.body.clientType)
    ) {
      return res.status(400).json({ message: 'Invalid clientType' });
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
      'clientType',
      'contactName',
      'phone',
      'email',
      'geoState',
      'city',
      'acquisitionSource',
      'notes',
    ].forEach((field) => {
      if (req.body[field] !== undefined) {
        client[field] = req.body[field];
      }
    });

    if (req.body.firstContactAt !== undefined) {
      client.firstContactAt = req.body.firstContactAt || null;
    } else if (req.body.joinedAt !== undefined) {
      client.firstContactAt = req.body.joinedAt || null;
    }

    await client.save();

    if (req.body.name) {
      await BestInPrintJob.updateMany(
        { client: client._id },
        { clientName: client.name }
      );
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Best In Print clients' });
    }

    const client = await BestInPrintClient.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    await BestInPrintJob.deleteMany({ client: client._id });

    res.json({ message: 'Client and jobs deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
