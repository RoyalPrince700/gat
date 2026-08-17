const express = require('express');
const BesttechClient = require('../models/BesttechClient');
const BesttechProject = require('../models/BesttechProject');
const Company = require('../models/Company');
const { protect, isMdOrAdmin } = require('../middleware/auth');
const {
  ACQUISITION_SOURCE_VALUES,
} = require('../utils/besttechMeta');

const router = express.Router();
const COMPANY_SLUG = 'best-technology-it';

const getBesttechCompany = async () => Company.findOne({ slug: COMPANY_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === COMPANY_SLUG;
};

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best Technology IT clients' });
    }

    const clients = await BesttechClient.find()
      .populate('createdBy', 'name email')
      .sort({ name: 1 });

    const projectStats = await BesttechProject.aggregate([
      {
        $group: {
          _id: '$client',
          projectCount: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['active', 'proposal']] },
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
      projectStats.map((row) => [String(row._id), row])
    );

    const withStats = clients.map((client) => {
      const stats = statsByClient.get(String(client._id));
      return {
        ...client.toObject(),
        projectCount: stats?.projectCount || 0,
        activeCount: stats?.activeCount || 0,
        contractValue: stats?.contractValue || 0,
      };
    });

    const overview = withStats.reduce(
      (acc, c) => {
        acc.totalClients += 1;
        acc.totalProjects += c.projectCount;
        acc.pipelineValue += c.contractValue;
        return acc;
      },
      { totalClients: 0, totalProjects: 0, pipelineValue: 0 }
    );

    res.json({ clients: withStats, overview });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best Technology IT clients' });
    }

    const client = await BesttechClient.findById(req.params.id).populate(
      'createdBy',
      'name email'
    );
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const projects = await BesttechProject.find({ client: client._id })
      .sort({ date: -1 })
      .populate('createdBy', 'name email');

    res.json({ client, projects });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Best Technology IT clients' });
    }

    const company = await getBesttechCompany();
    if (!company) {
      return res
        .status(404)
        .json({ message: 'Best Technology IT not found. Run seed.' });
    }

    const {
      name,
      industry,
      contactName,
      phone,
      email,
      website,
      geoState,
      city,
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

    const client = await BesttechClient.create({
      company: company._id,
      createdBy: req.user._id,
      name,
      industry: industry || '',
      contactName: contactName || '',
      phone: phone || '',
      email: email || '',
      website: website || '',
      geoState: geoState || '',
      city: city || '',
      firstContactAt: firstContactAt || null,
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
      return res.status(403).json({ message: 'No access to Best Technology IT clients' });
    }

    const client = await BesttechClient.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
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
      'website',
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
    }

    await client.save();

    if (req.body.name) {
      await BesttechProject.updateMany(
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
      return res.status(403).json({ message: 'No access to Best Technology IT clients' });
    }

    const client = await BesttechClient.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    await BesttechProject.deleteMany({ client: client._id });

    res.json({ message: 'Client and projects deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
