export const SMIPAY_CATEGORIES = [
  { value: 'airtime', label: 'Airtime' },
  { value: 'data', label: 'Data' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'electricity', label: 'Electricity bill' },
  { value: 'exam_body', label: 'Exam body' },
  { value: 'cable_tv', label: 'Cable TV' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

export const SMIPAY_NETWORKS = [
  { value: 'mtn', label: 'MTN' },
  { value: 'airtel', label: 'Airtel' },
  { value: 'glo', label: 'Glo' },
  { value: '9mobile', label: '9mobile' },
];

/** Transaction outcome status */
export const SMIPAY_STATUSES = [
  { value: 'successful', label: 'Successful' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
];

export const SMIPAY_CREATE_STATUSES = [
  { value: 'successful', label: 'Successful' },
  { value: 'pending', label: 'Pending' },
];

/** Common Nigerian data plan sizes */
export const SMIPAY_DATA_PLANS = [
  { value: '0.1', label: '100MB', gb: 0.1 },
  { value: '0.2', label: '200MB', gb: 0.2 },
  { value: '0.5', label: '500MB', gb: 0.5 },
  { value: '0.75', label: '750MB', gb: 0.75 },
  { value: '1', label: '1GB', gb: 1 },
  { value: '1.5', label: '1.5GB', gb: 1.5 },
  { value: '2', label: '2GB', gb: 2 },
  { value: '2.5', label: '2.5GB', gb: 2.5 },
  { value: '3', label: '3GB', gb: 3 },
  { value: '4', label: '4GB', gb: 4 },
  { value: '5', label: '5GB', gb: 5 },
  { value: '6', label: '6GB', gb: 6 },
  { value: '7', label: '7GB', gb: 7 },
  { value: '8', label: '8GB', gb: 8 },
  { value: '10', label: '10GB', gb: 10 },
  { value: '12', label: '12GB', gb: 12 },
  { value: '15', label: '15GB', gb: 15 },
  { value: '20', label: '20GB', gb: 20 },
  { value: '25', label: '25GB', gb: 25 },
  { value: '30', label: '30GB', gb: 30 },
  { value: '40', label: '40GB', gb: 40 },
  { value: '50', label: '50GB', gb: 50 },
  { value: '75', label: '75GB', gb: 75 },
  { value: '100', label: '100GB', gb: 100 },
  { value: 'custom', label: 'Custom size…', gb: null },
];

/** Data plan validity / duration */
export const SMIPAY_DATA_DURATIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '2_days', label: '2 days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: '3_months', label: '3 months' },
];

/** Brand colors aligned with www.smipay.ng */
export const SMIPAY_COLORS = {
  orange: '#f26522',
  orangeHover: '#d9551a',
  green: '#2db84b',
  ink: '#2b2b2b',
  muted: '#555555',
  chartSecondary: '#8a9a8e',
};

export const categoryLabel = (value) => {
  if (value === 'betting') return 'Other';
  return SMIPAY_CATEGORIES.find((c) => c.value === value)?.label || value;
};

export const networkLabel = (value) =>
  SMIPAY_NETWORKS.find((n) => n.value === value)?.label || value || '—';

export const statusLabel = (value) =>
  SMIPAY_STATUSES.find((s) => s.value === value)?.label || value || 'Successful';

export const formatDataSize = (gb) => {
  if (gb == null || gb === '') return '—';
  const n = Number(gb);
  if (Number.isNaN(n)) return '—';
  if (n < 1) return `${Math.round(n * 1000)}MB`;
  if (Number.isInteger(n)) return `${n}GB`;
  return `${n}GB`;
};

export const dataDurationLabel = (value) =>
  SMIPAY_DATA_DURATIONS.find((d) => d.value === value)?.label || value || '—';

export const formatDataPlan = (recordOrGb, duration) => {
  if (recordOrGb && typeof recordOrGb === 'object') {
    if (recordOrGb.dataPlanLabel) return recordOrGb.dataPlanLabel;
    const size = formatDataSize(recordOrGb.dataSizeGb);
    const dur = dataDurationLabel(recordOrGb.dataPlanDuration);
    if (size === '—' && dur === '—') return '—';
    if (size === '—') return dur;
    if (dur === '—') return size;
    return `${size} · ${dur}`;
  }
  const size = formatDataSize(recordOrGb);
  const dur = dataDurationLabel(duration);
  if (size === '—' && dur === '—') return '—';
  if (size === '—') return dur;
  if (dur === '—') return size;
  return `${size} · ${dur}`;
};

export const needsNetwork = (category) =>
  category === 'airtime' || category === 'data';

export const ACQUISITION_SOURCES = [
  { value: 'organic', label: 'Organic' },
  { value: 'referral', label: 'Referral' },
  { value: 'agent', label: 'Agent' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'social', label: 'Social media' },
  { value: 'school', label: 'School / campus' },
  { value: 'other', label: 'Other' },
];

export const FAILURE_REASONS = [
  { value: 'insufficient_funds', label: 'Insufficient funds' },
  { value: 'network_down', label: 'Network down' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'invalid_number', label: 'Invalid number' },
  { value: 'provider_error', label: 'Provider error' },
  { value: 'user_cancelled', label: 'User cancelled' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'ussd', label: 'USSD' },
  { value: 'cash_agent', label: 'Cash to agent' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' },
];

export const GEO_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
  'Unknown',
];

export const acquisitionLabel = (value) =>
  ACQUISITION_SOURCES.find((s) => s.value === value)?.label || value || '—';

export const failureReasonLabel = (value) =>
  FAILURE_REASONS.find((r) => r.value === value)?.label || value || '—';

export const paymentMethodLabel = (value) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label || value || '—';
