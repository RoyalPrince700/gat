const express = require('express');
const multer = require('multer');
const AccessibleSchoolPurchase = require('../models/AccessibleSchoolPurchase');
const Company = require('../models/Company');
const { protect, adminOnly, isMdOrAdmin } = require('../middleware/auth');
const {
  ACCESSIBLE_SLUG,
  ACCESSIBLE_SEASONS,
} = require('../utils/accessibleMeta');
const {
  inferSeasonFromFilename,
  isCanonicalSeason,
  isJunkSchoolName,
} = require('../utils/accessibleSchoolName');
const { importPurchasesFromBuffer } = require('../utils/accessiblePurchasesImport');
const { buildPurchaseAnalytics } = require('../utils/accessiblePurchaseAnalytics');

const router = express.Router();

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    const ok =
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ].includes(file.mimetype);
    if (!ok) {
      return cb(new Error('Only Excel (.xlsx, .xls) files are allowed'));
    }
    cb(null, true);
  },
});

const getAccessibleCompany = async () =>
  Company.findOne({ slug: ACCESSIBLE_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === ACCESSIBLE_SLUG;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFilter = (companyId, { season, search }) => {
  const filter = { company: companyId };
  if (season && season !== 'all' && isCanonicalSeason(season)) {
    filter.season = season;
  }
  if (search && String(search).trim()) {
    filter.schoolName = new RegExp(escapeRegex(String(search).trim()), 'i');
  }
  return filter;
};

const summarizePurchases = (docs) => {
  const schoolKeys = new Set();
  let totalAmount = 0;
  const seasonMap = new Map();
  const schoolMap = new Map();

  for (const d of docs) {
    const key = String(d.schoolName || '')
      .trim()
      .toLowerCase();
    schoolKeys.add(key);
    totalAmount += d.amount || 0;

    const sm = seasonMap.get(d.season) || {
      season: d.season,
      rowCount: 0,
      schoolKeys: new Set(),
      totalAmount: 0,
    };
    sm.rowCount += 1;
    sm.schoolKeys.add(key);
    sm.totalAmount += d.amount || 0;
    seasonMap.set(d.season, sm);

    const existing = schoolMap.get(key) || {
      schoolName: d.schoolName,
      amount: 0,
      rowCount: 0,
      seasons: new Set(),
    };
    existing.amount += d.amount || 0;
    existing.rowCount += 1;
    existing.seasons.add(d.season);
    schoolMap.set(key, existing);
  }

  return {
    rowCount: docs.length,
    schoolCount: schoolKeys.size,
    totalAmount,
    bySeason: ACCESSIBLE_SEASONS.filter((s) => seasonMap.has(s)).map((s) => {
      const sm = seasonMap.get(s);
      return {
        season: s,
        rowCount: sm.rowCount,
        schoolCount: sm.schoolKeys.size,
        totalAmount: sm.totalAmount,
      };
    }),
    bySchool: Array.from(schoolMap.values())
      .map((s) => ({
        schoolName: s.schoolName,
        amount: s.amount,
        rowCount: s.rowCount,
        seasons: Array.from(s.seasons).sort(),
      }))
      .sort(
        (a, b) =>
          b.amount - a.amount || a.schoolName.localeCompare(b.schoolName)
      ),
  };
};

const listPurchases = async (companyId, query) => {
  const filter = buildFilter(companyId, query);
  const all = await AccessibleSchoolPurchase.find(filter)
    .select('schoolName amount season sourceRow createdAt')
    .sort({ schoolName: 1, season: 1 })
    .lean();
  const items = all.filter((row) => !isJunkSchoolName(row.schoolName));
  return { items, summary: summarizePurchases(items) };
};

router.get('/purchases/analytics', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({
        message: 'Accessible Publishers company not found. Run seed.',
      });
    }

    const data = await buildPurchaseAnalytics(company._id, {
      season: req.query.season,
      nairaPerPoint: req.query.nairaPerPoint,
      giftCostPerPoint: req.query.giftCostPerPoint,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/purchases/summary', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({
        message: 'Accessible Publishers company not found. Run seed.',
      });
    }

    const { items, summary } = await listPurchases(company._id, req.query);
    res.json({
      ...summary,
      seasons: ACCESSIBLE_SEASONS,
      itemCount: items.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/purchases', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res
        .status(403)
        .json({ message: 'No access to Accessible Publishers data' });
    }

    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({
        message: 'Accessible Publishers company not found. Run seed.',
      });
    }

    const { items, summary } = await listPurchases(company._id, req.query);
    res.json({
      items,
      summary: {
        rowCount: summary.rowCount,
        schoolCount: summary.schoolCount,
        totalAmount: summary.totalAmount,
        bySeason: summary.bySeason,
      },
      bySchool: summary.bySchool,
      seasons: ACCESSIBLE_SEASONS,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post(
  '/purchases/import',
  protect,
  adminOnly,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large (max 10 MB)'
            : err.message || 'Upload failed';
        return res.status(400).json({ message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const company = await getAccessibleCompany();
      if (!company) {
        return res.status(404).json({
          message: 'Accessible Publishers company not found. Run seed.',
        });
      }

      if (!req.file || !req.file.buffer) {
        return res
          .status(400)
          .json({ message: 'Choose an Excel (.xlsx or .xls) file to upload' });
      }

      let season = String(req.body.season || '').trim();
      if (!isCanonicalSeason(season)) {
        season = inferSeasonFromFilename(req.file.originalname);
      }
      if (!isCanonicalSeason(season)) {
        return res.status(400).json({
          message:
            'Select a season (2023-2024, 2024-2025, or 2025-2026) before uploading',
        });
      }

      const mode =
        String(req.body.mode || 'replace').toLowerCase() === 'append'
          ? 'append'
          : 'replace';

      const result = await importPurchasesFromBuffer({
        buffer: req.file.buffer,
        companyId: company._id,
        season,
        userId: req.user._id,
        mode,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({
        message: error.message || 'Could not import spreadsheet',
      });
    }
  }
);

router.delete('/purchases', protect, adminOnly, async (req, res) => {
  try {
    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({
        message: 'Accessible Publishers company not found. Run seed.',
      });
    }

    const season = String(req.query.season || req.body.season || '').trim();
    if (!isCanonicalSeason(season)) {
      return res.status(400).json({
        message: 'Provide a season to clear (2023-2024, 2024-2025, or 2025-2026)',
      });
    }

    const deleted = await AccessibleSchoolPurchase.deleteMany({
      company: company._id,
      season,
    });

    res.json({
      message: `Cleared ${season}`,
      season,
      deleted: deleted.deletedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
