const express = require('express');
const multer = require('multer');
const Staff = require('../models/Staff');
const { protect, adminOnly, mdOrAdmin } = require('../middleware/auth');
const {
  importStaffFromBuffer,
  buildStaffTemplateBuffer,
} = require('../utils/staffImport');

const router = express.Router();

const STATUSES = ['active', 'inactive'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase();
    const ok =
      name.endsWith('.xlsx') ||
      name.endsWith('.xls') ||
      name.endsWith('.csv') ||
      [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'application/csv',
        'text/plain',
      ].includes(file.mimetype);
    if (!ok) {
      return cb(
        new Error('Only Excel (.xlsx, .xls) or CSV files are allowed')
      );
    }
    cb(null, true);
  },
});

const populateStaff = (query) =>
  query.populate('company', 'name slug type').sort({ name: 1 });

const formatStaffList = async (filter = {}) =>
  populateStaff(Staff.find(filter));

router.get('/', protect, mdOrAdmin, async (req, res) => {
  try {
    const { company, department, status, search } = req.query;
    const filter = {};

    if (company) filter.company = company;
    if (department) {
      filter.department = new RegExp(
        `^${String(department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        'i'
      );
    }
    if (status && STATUSES.includes(status)) {
      filter.status = status;
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { department: new RegExp(q, 'i') },
        { jobTitle: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
      ];
    }

    const staff = await formatStaffList(filter);
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Excel/CSV template for bulk staff import (admin). */
router.get('/template', protect, adminOnly, (req, res) => {
  try {
    const buffer = buildStaffTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="gat-staff-template.xlsx"'
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Bulk import staff from Excel/CSV.
 * Match rule: rows with email update existing staff on that email; otherwise create.
 */
router.post(
  '/import',
  protect,
  adminOnly,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large (max 5 MB)'
            : err.message || 'Upload failed';
        return res.status(400).json({ message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res
          .status(400)
          .json({ message: 'Choose an Excel or CSV file to upload' });
      }

      const result = await importStaffFromBuffer(req.file.buffer);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        message: error.message || 'Could not parse spreadsheet',
      });
    }
  }
);

router.get('/:id', protect, mdOrAdmin, async (req, res) => {
  try {
    const staff = await populateStaff(Staff.findById(req.params.id));
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      name,
      department,
      company,
      jobTitle,
      email,
      phone,
      status = 'active',
      notes,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!department || !String(department).trim()) {
      return res.status(400).json({ message: 'Department is required' });
    }
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const staff = await Staff.create({
      name: String(name).trim(),
      department: String(department).trim(),
      company: company || null,
      jobTitle: jobTitle ? String(jobTitle).trim() : '',
      email: email ? String(email).trim().toLowerCase() : '',
      phone: phone ? String(phone).trim() : '',
      status: status || 'active',
      notes: notes ? String(notes).trim() : '',
    });

    res.status(201).json(await populateStaff(Staff.findById(staff._id)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const {
      name,
      department,
      company,
      jobTitle,
      email,
      phone,
      status,
      notes,
    } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ message: 'Name is required' });
      }
      staff.name = String(name).trim();
    }
    if (department !== undefined) {
      if (!String(department).trim()) {
        return res.status(400).json({ message: 'Department is required' });
      }
      staff.department = String(department).trim();
    }
    if (company !== undefined) staff.company = company || null;
    if (jobTitle !== undefined) staff.jobTitle = String(jobTitle || '').trim();
    if (email !== undefined) {
      staff.email = email ? String(email).trim().toLowerCase() : '';
    }
    if (phone !== undefined) staff.phone = String(phone || '').trim();
    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      staff.status = status;
    }
    if (notes !== undefined) staff.notes = String(notes || '').trim();

    await staff.save();
    res.json(await populateStaff(Staff.findById(staff._id)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Soft-delete: mark inactive so assessment history remains attributable.
    staff.status = 'inactive';
    await staff.save();
    res.json(await populateStaff(Staff.findById(staff._id)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
