const express = require('express');
const SocialMediaRecord = require('../models/SocialMediaRecord');
const Company = require('../models/Company');
const { protect, adminOnly } = require('../middleware/auth');
const {
  SOCIAL_MEDIA_PLATFORMS,
  SOCIAL_MEDIA_PLATFORM_VALUES,
} = require('../utils/socialMediaPlatforms');

const router = express.Router();

const getSmipayCompany = async () => Company.findOne({ slug: 'smipay' });

const canAccess = (user) => {
  if (user.role === 'admin') return true;
  return user.company && user.company.slug === 'smipay';
};

const toDayStart = (value) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

router.get('/meta/platforms', protect, async (req, res) => {
  if (!canAccess(req.user)) {
    return res.status(403).json({ message: 'No access to Smipay social media data' });
  }
  res.json(SOCIAL_MEDIA_PLATFORMS);
});

router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toDayStart(from);
      if (to) {
        const end = toDayStart(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const records = await SocialMediaRecord.find(filter).sort({ date: 1 });

    const byDateMap = {};
    const byPlatformMap = {};
    let totalNewFollowers = 0;

    SOCIAL_MEDIA_PLATFORM_VALUES.forEach((p) => {
      byPlatformMap[p] = {
        platform: p,
        newFollowers: 0,
        recordCount: 0,
        latestTotal: null,
        latestDate: null,
      };
    });

    records.forEach((r) => {
      const key = r.date.toISOString().slice(0, 10);
      if (!byDateMap[key]) {
        byDateMap[key] = {
          date: key,
          facebook: 0,
          linkedin: 0,
          instagram: 0,
          twitter: 0,
          total: 0,
        };
      }
      byDateMap[key][r.platform] += r.newFollowers;
      byDateMap[key].total += r.newFollowers;

      const plat = byPlatformMap[r.platform];
      plat.newFollowers += r.newFollowers;
      plat.recordCount += 1;
      if (
        r.totalFollowers != null &&
        (!plat.latestDate || r.date >= plat.latestDate)
      ) {
        plat.latestTotal = r.totalFollowers;
        plat.latestDate = r.date;
      }

      totalNewFollowers += r.newFollowers;
    });

    const trend = Object.values(byDateMap);
    let running = 0;
    const cumulative = trend.map((row) => {
      running += row.total;
      return {
        date: row.date,
        cumulative: running,
        facebook: row.facebook,
        linkedin: row.linkedin,
        instagram: row.instagram,
        twitter: row.twitter,
        total: row.total,
      };
    });

    res.json({
      summary: {
        totalNewFollowers,
        recordCount: records.length,
        dayCount: trend.length,
        byPlatform: SOCIAL_MEDIA_PLATFORM_VALUES.map((p) => ({
          platform: p,
          newFollowers: byPlatformMap[p].newFollowers,
          recordCount: byPlatformMap[p].recordCount,
          latestTotal: byPlatformMap[p].latestTotal,
        })),
      },
      trend,
      cumulative,
      byPlatform: Object.values(byPlatformMap).sort(
        (a, b) => b.newFollowers - a.newFollowers
      ),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay social media data' });
    }

    const { from, to, platform } = req.query;
    const filter = {};

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = toDayStart(from);
      if (to) {
        const end = toDayStart(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }
    if (platform) {
      if (!SOCIAL_MEDIA_PLATFORM_VALUES.includes(platform)) {
        return res.status(400).json({ message: 'Invalid platform' });
      }
      filter.platform = platform;
    }

    const records = await SocialMediaRecord.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: -1, platform: 1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay social media data' });
    }

    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found. Run seed.' });
    }

    const { platform, newFollowers, totalFollowers, date, notes } = req.body;

    if (newFollowers == null || !date || !platform) {
      return res.status(400).json({
        message: 'platform, newFollowers and date are required',
      });
    }

    if (!SOCIAL_MEDIA_PLATFORM_VALUES.includes(platform)) {
      return res.status(400).json({ message: 'Invalid platform' });
    }

    const day = toDayStart(date);

    const record = await SocialMediaRecord.create({
      company: company._id,
      createdBy: req.user._id,
      platform,
      newFollowers: Number(newFollowers),
      totalFollowers:
        totalFollowers === '' || totalFollowers == null
          ? null
          : Number(totalFollowers),
      date: day,
      notes: notes || '',
    });

    const populated = await SocialMediaRecord.findById(record._id).populate(
      'createdBy',
      'name email'
    );

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          'An entry for this platform and date already exists. Edit the existing record instead.',
      });
    }
    res.status(500).json({ message: error.message });
  }
});

router.post('/bulk', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay social media data' });
    }

    const company = await getSmipayCompany();
    if (!company) {
      return res.status(404).json({ message: 'Smipay company not found. Run seed.' });
    }

    const { date, entries } = req.body;
    if (!date || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'date and entries are required' });
    }

    const day = toDayStart(date);
    const created = [];

    for (const entry of entries) {
      const { platform, newFollowers, totalFollowers, notes } = entry;
      if (
        newFollowers == null ||
        newFollowers === '' ||
        !SOCIAL_MEDIA_PLATFORM_VALUES.includes(platform)
      ) {
        continue;
      }

      const payload = {
        company: company._id,
        createdBy: req.user._id,
        platform,
        newFollowers: Number(newFollowers),
        totalFollowers:
          totalFollowers === '' || totalFollowers == null
            ? null
            : Number(totalFollowers),
        date: day,
        notes: notes || '',
      };

      const record = await SocialMediaRecord.findOneAndUpdate(
        { company: company._id, platform, date: day },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      created.push(record);
    }

    if (created.length === 0) {
      return res.status(400).json({
        message: 'Provide at least one platform with new followers',
      });
    }

    const ids = created.map((r) => r._id);
    const records = await SocialMediaRecord.find({ _id: { $in: ids } })
      .populate('createdBy', 'name email')
      .sort({ platform: 1 });

    res.status(201).json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay social media data' });
    }

    const record = await SocialMediaRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (
      req.user.role !== 'admin' &&
      String(record.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'You can only edit your own entries' });
    }

    const { platform, newFollowers, totalFollowers, date, notes } = req.body;

    if (platform != null) {
      if (!SOCIAL_MEDIA_PLATFORM_VALUES.includes(platform)) {
        return res.status(400).json({ message: 'Invalid platform' });
      }
      record.platform = platform;
    }
    if (newFollowers != null) record.newFollowers = Number(newFollowers);
    if (totalFollowers !== undefined) {
      record.totalFollowers =
        totalFollowers === '' || totalFollowers == null
          ? null
          : Number(totalFollowers);
    }
    if (date) record.date = toDayStart(date);
    if (notes !== undefined) record.notes = notes;

    await record.save();
    const populated = await SocialMediaRecord.findById(record._id).populate(
      'createdBy',
      'name email'
    );
    res.json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'An entry for this platform and date already exists.',
      });
    }
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'No access to Smipay social media data' });
    }

    const record = await SocialMediaRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }

    if (
      req.user.role !== 'admin' &&
      String(record.createdBy) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'You can only delete your own entries' });
    }

    await record.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
