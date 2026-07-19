const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SUBSCRIPTION_STATUS_VALUES = SUBSCRIPTION_STATUSES.map((s) => s.value);

const YES_NO = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
];

const parseBool = (value, fallback = false) => {
  if (value === true || value === 'true' || value === 'yes' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 'no' || value === 0 || value === '0') {
    return false;
  }
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return Boolean(value);
};

module.exports = {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_VALUES,
  YES_NO,
  parseBool,
};
