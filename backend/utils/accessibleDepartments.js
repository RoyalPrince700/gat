const path = require('path');
const fs = require('fs');

const ACCESSIBLE_DEPARTMENTS = [
  {
    id: 'hr',
    label: 'Admin / HR unit',
    shortLabel: 'Admin / HR',
    defaultTitle: 'Admin / HR Unit — Monthly Performance Report',
  },
  {
    id: 'system-control',
    label: 'System control unit',
    shortLabel: 'System control',
    defaultTitle: 'System Control Unit — Monthly Performance Report',
  },
  {
    id: 'customer-service',
    label: 'Customer service operations',
    shortLabel: 'Customer service',
    defaultTitle: 'Customer Service Operations — Monthly Performance Report',
  },
];

const ACCESSIBLE_DEPARTMENT_VALUES = ACCESSIBLE_DEPARTMENTS.map((d) => d.id);

const DEPARTMENT_BY_ID = Object.fromEntries(
  ACCESSIBLE_DEPARTMENTS.map((d) => [d.id, d])
);

const isValidDepartment = (value) =>
  ACCESSIBLE_DEPARTMENT_VALUES.includes(String(value || '').trim());

/** Period must be YYYY-MM */
const isValidPeriod = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ''));

const periodLabelFromKey = (period) => {
  const match = String(period || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return String(period || '');
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

const SEED_DIR = path.join(__dirname, '..', 'data', 'accessible-reports');

const DEFAULT_SEED_PERIOD = '2026-08';

const readSeedContent = (departmentId) => {
  const filePath = path.join(SEED_DIR, `${departmentId}.md`);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
};

/**
 * Ensure August seed reports exist for each department (insert only; never overwrite edits).
 */
const ensureAccessibleDepartmentReports = async (Model, companyId) => {
  const existing = await Model.find({
    company: companyId,
    period: DEFAULT_SEED_PERIOD,
  })
    .select('department')
    .lean();
  const have = new Set(existing.map((r) => r.department));
  const missing = ACCESSIBLE_DEPARTMENTS.filter((d) => !have.has(d.id));
  if (!missing.length) return;

  await Model.insertMany(
    missing.map((dept) => ({
      company: companyId,
      department: dept.id,
      period: DEFAULT_SEED_PERIOD,
      periodLabel: periodLabelFromKey(DEFAULT_SEED_PERIOD),
      title: dept.defaultTitle,
      content: readSeedContent(dept.id),
      updatedBy: null,
    }))
  );
};

module.exports = {
  ACCESSIBLE_DEPARTMENTS,
  ACCESSIBLE_DEPARTMENT_VALUES,
  DEPARTMENT_BY_ID,
  isValidDepartment,
  isValidPeriod,
  periodLabelFromKey,
  DEFAULT_SEED_PERIOD,
  ensureAccessibleDepartmentReports,
};
