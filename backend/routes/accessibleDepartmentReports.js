const express = require('express');
const AccessibleDepartmentReport = require('../models/AccessibleDepartmentReport');
const Company = require('../models/Company');
const { protect, adminOnly, isMdOrAdmin } = require('../middleware/auth');
const { ACCESSIBLE_SLUG } = require('../utils/accessibleMeta');
const {
  ACCESSIBLE_DEPARTMENTS,
  DEPARTMENT_BY_ID,
  isValidDepartment,
  isValidPeriod,
  periodLabelFromKey,
  ensureAccessibleDepartmentReports,
} = require('../utils/accessibleDepartments');

const router = express.Router();

const getAccessibleCompany = async () =>
  Company.findOne({ slug: ACCESSIBLE_SLUG });

const canAccess = (user) => {
  if (isMdOrAdmin(user)) return true;
  return user.company && user.company.slug === ACCESSIBLE_SLUG;
};

const serialize = (doc) => {
  const plain = doc.toObject ? doc.toObject() : doc;
  const meta = DEPARTMENT_BY_ID[plain.department];
  return {
    ...plain,
    departmentLabel: meta?.label || plain.department,
    departmentShortLabel: meta?.shortLabel || plain.department,
  };
};

/**
 * GET /api/accessible/department-reports
 * Optional ?period=YYYY-MM&department=hr
 * Seeds August 2026 defaults when missing.
 */
router.get('/department-reports', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({ message: 'Accessible Publishers not found' });
    }

    await ensureAccessibleDepartmentReports(
      AccessibleDepartmentReport,
      company._id
    );

    const filter = { company: company._id };
    if (req.query.period) {
      if (!isValidPeriod(req.query.period)) {
        return res.status(400).json({ message: 'Invalid period. Use YYYY-MM.' });
      }
      filter.period = req.query.period;
    }
    if (req.query.department) {
      if (!isValidDepartment(req.query.department)) {
        return res.status(400).json({ message: 'Invalid department.' });
      }
      filter.department = req.query.department;
    }

    const reports = await AccessibleDepartmentReport.find(filter)
      .populate('updatedBy', 'name email')
      .sort({ period: -1, department: 1 })
      .lean();

    const periods = await AccessibleDepartmentReport.distinct('period', {
      company: company._id,
    });
    periods.sort().reverse();

    res.json({
      departments: ACCESSIBLE_DEPARTMENTS,
      periods,
      reports: reports.map(serialize),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load reports' });
  }
});

/**
 * GET /api/accessible/department-reports/:id
 */
router.get('/department-reports/:id', protect, async (req, res) => {
  try {
    if (!canAccess(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const company = await getAccessibleCompany();
    if (!company) {
      return res.status(404).json({ message: 'Accessible Publishers not found' });
    }

    const report = await AccessibleDepartmentReport.findOne({
      _id: req.params.id,
      company: company._id,
    }).populate('updatedBy', 'name email');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(serialize(report));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load report' });
  }
});

/**
 * PUT /api/accessible/department-reports/:id
 * Admin only — update title, content, period label.
 */
router.put(
  '/department-reports/:id',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const company = await getAccessibleCompany();
      if (!company) {
        return res
          .status(404)
          .json({ message: 'Accessible Publishers not found' });
      }

      const report = await AccessibleDepartmentReport.findOne({
        _id: req.params.id,
        company: company._id,
      });
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      const { title, content, periodLabel } = req.body || {};

      if (title !== undefined) {
        report.title = String(title).trim();
      }
      if (content !== undefined) {
        report.content = String(content);
      }
      if (periodLabel !== undefined) {
        report.periodLabel = String(periodLabel).trim();
      }

      report.updatedBy = req.user._id;
      await report.save();
      await report.populate('updatedBy', 'name email');

      res.json(serialize(report));
    } catch (error) {
      res
        .status(500)
        .json({ message: error.message || 'Failed to update report' });
    }
  }
);

/**
 * POST /api/accessible/department-reports
 * Admin only — create a new period report for a department (copies blank or prior).
 */
router.post(
  '/department-reports',
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const company = await getAccessibleCompany();
      if (!company) {
        return res
          .status(404)
          .json({ message: 'Accessible Publishers not found' });
      }

      const { department, period, title, content, periodLabel, copyFromId } =
        req.body || {};

      if (!isValidDepartment(department)) {
        return res.status(400).json({ message: 'Invalid department.' });
      }
      if (!isValidPeriod(period)) {
        return res.status(400).json({ message: 'Invalid period. Use YYYY-MM.' });
      }

      const existing = await AccessibleDepartmentReport.findOne({
        company: company._id,
        department,
        period,
      });
      if (existing) {
        return res.status(409).json({
          message: 'A report for this department and period already exists.',
          report: serialize(existing),
        });
      }

      let bodyContent = content != null ? String(content) : '';
      let bodyTitle = title != null ? String(title).trim() : '';

      if (copyFromId) {
        const source = await AccessibleDepartmentReport.findOne({
          _id: copyFromId,
          company: company._id,
        });
        if (source) {
          if (!bodyContent) bodyContent = source.content;
          if (!bodyTitle) bodyTitle = source.title;
        }
      }

      const meta = DEPARTMENT_BY_ID[department];
      if (!bodyTitle) bodyTitle = meta?.defaultTitle || 'Department report';

      const report = await AccessibleDepartmentReport.create({
        company: company._id,
        department,
        period,
        periodLabel:
          periodLabel != null && String(periodLabel).trim()
            ? String(periodLabel).trim()
            : periodLabelFromKey(period),
        title: bodyTitle,
        content: bodyContent,
        updatedBy: req.user._id,
      });

      await report.populate('updatedBy', 'name email');
      res.status(201).json(serialize(report));
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: 'A report for this department and period already exists.',
        });
      }
      res
        .status(500)
        .json({ message: error.message || 'Failed to create report' });
    }
  }
);

module.exports = router;
