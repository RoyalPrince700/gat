const XLSX = require('xlsx');
const Company = require('../models/Company');
const Staff = require('../models/Staff');

const STATUSES = new Set(['active', 'inactive']);
const MAX_ROWS = 2000;

/** Normalize spreadsheet headers for flexible matching. */
const normalizeHeader = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_\-./]+/g, '');

const HEADER_MAP = {
  name: 'name',
  fullname: 'name',
  staffname: 'name',
  department: 'department',
  dept: 'department',
  company: 'company',
  companyname: 'company',
  companyslug: 'company',
  jobtitle: 'jobTitle',
  job: 'jobTitle',
  title: 'jobTitle',
  roletitle: 'jobTitle',
  role: 'jobTitle',
  email: 'email',
  mail: 'email',
  phone: 'phone',
  mobile: 'phone',
  telephone: 'phone',
  tel: 'phone',
  status: 'status',
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
};

const cellString = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

const buildHeaderIndex = (headerRow) => {
  const index = {};
  headerRow.forEach((raw, col) => {
    const key = HEADER_MAP[normalizeHeader(raw)];
    if (key && index[key] === undefined) {
      index[key] = col;
    }
  });
  return index;
};

const rowToObject = (row, headerIndex) => {
  const get = (field) => {
    const col = headerIndex[field];
    if (col === undefined) return '';
    return cellString(row[col]);
  };
  return {
    name: get('name'),
    department: get('department'),
    company: get('company'),
    jobTitle: get('jobTitle'),
    email: get('email').toLowerCase(),
    phone: get('phone'),
    status: get('status').toLowerCase() || 'active',
    notes: get('notes'),
  };
};

const isEmptyRow = (fields) =>
  !fields.name &&
  !fields.department &&
  !fields.company &&
  !fields.jobTitle &&
  !fields.email &&
  !fields.phone &&
  !fields.notes &&
  (!fields.status || fields.status === 'active');

const resolveCompanyId = (raw, companies) => {
  if (!raw) return { companyId: null };
  const needle = String(raw).trim().toLowerCase();
  const bySlug = companies.find((c) => c.slug === needle);
  if (bySlug) return { companyId: bySlug._id };
  const byName = companies.find((c) => c.name.toLowerCase() === needle);
  if (byName) return { companyId: byName._id };
  return {
    error: `Unknown company "${raw}" (use company name or slug from the system)`,
  };
};

/**
 * Match rule: if email is present, update existing staff with same email
 * (case-insensitive). Otherwise always create a new record.
 */
const importStaffFromBuffer = async (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: 'Workbook has no sheets' }],
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (!rows.length) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: 'File is empty' }],
    };
  }

  const headerIndex = buildHeaderIndex(rows[0]);
  if (headerIndex.name === undefined || headerIndex.department === undefined) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [
        {
          row: 1,
          message:
            'Missing required columns: name and department (headers are flexible, e.g. Name, Department)',
        },
      ],
    };
  }

  const companies = await Company.find().select('name slug').lean();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_ROWS) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [
        {
          row: 0,
          message: `Too many rows (max ${MAX_ROWS}). Split the file and try again.`,
        },
      ],
    };
  }

  for (let i = 0; i < dataRows.length; i += 1) {
    const excelRow = i + 2; // 1-based, accounting for header
    const fields = rowToObject(dataRows[i], headerIndex);

    if (isEmptyRow(fields)) {
      skipped += 1;
      continue;
    }

    if (!fields.name) {
      skipped += 1;
      errors.push({ row: excelRow, message: 'Name is required' });
      continue;
    }
    if (!fields.department) {
      skipped += 1;
      errors.push({ row: excelRow, message: 'Department is required' });
      continue;
    }

    if (fields.status && !STATUSES.has(fields.status)) {
      skipped += 1;
      errors.push({
        row: excelRow,
        message: `Invalid status "${fields.status}" (use active or inactive)`,
      });
      continue;
    }

    const companyResult = resolveCompanyId(fields.company, companies);
    if (companyResult.error) {
      skipped += 1;
      errors.push({ row: excelRow, message: companyResult.error });
      continue;
    }

    const payload = {
      name: fields.name,
      department: fields.department,
      company: companyResult.companyId,
      jobTitle: fields.jobTitle,
      email: fields.email,
      phone: fields.phone,
      status: fields.status || 'active',
      notes: fields.notes,
    };

    try {
      if (payload.email) {
        const existing = await Staff.findOne({
          email: payload.email,
        });
        if (existing) {
          existing.name = payload.name;
          existing.department = payload.department;
          existing.company = payload.company;
          existing.jobTitle = payload.jobTitle;
          existing.phone = payload.phone;
          existing.status = payload.status;
          existing.notes = payload.notes;
          await existing.save();
          updated += 1;
          continue;
        }
      }

      await Staff.create(payload);
      imported += 1;
    } catch (err) {
      skipped += 1;
      errors.push({
        row: excelRow,
        message: err.message || 'Could not save row',
      });
    }
  }

  return { imported, updated, skipped, errors };
};

/** Build an .xlsx template buffer with headers + sample rows. */
const buildStaffTemplateBuffer = () => {
  const headers = [
    'name',
    'department',
    'company',
    'jobTitle',
    'email',
    'phone',
    'status',
    'notes',
  ];
  const samples = [
    [
      'Ada Okafor',
      'Finance',
      'Smipay',
      'Accountant',
      'ada.okafor@example.com',
      '08012345678',
      'active',
      'Example row — replace with real staff',
    ],
    [
      'Chidi Eze',
      'Tech',
      'best-technology-it',
      'Engineer',
      '',
      '',
      'active',
      'company may be name or slug',
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...samples]);
  sheet['!cols'] = headers.map((h) => ({
    wch: Math.max(12, h.length + 2),
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Staff');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  importStaffFromBuffer,
  buildStaffTemplateBuffer,
};
