const SMIPAY_NETWORKS = [
  { value: 'mtn', label: 'MTN' },
  { value: 'airtel', label: 'Airtel' },
  { value: 'glo', label: 'Glo' },
  { value: '9mobile', label: '9mobile' },
];

const SMIPAY_NETWORK_VALUES = SMIPAY_NETWORKS.map((n) => n.value);

/** Common Nigerian data plan sizes (GB). 0.5 = 500MB */
const SMIPAY_DATA_PLANS = [
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

const SMIPAY_DATA_DURATIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '2_days', label: '2 days' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: '3_months', label: '3 months' },
];

const SMIPAY_DATA_DURATION_VALUES = SMIPAY_DATA_DURATIONS.map((d) => d.value);

const SMIPAY_STATUSES = [
  { value: 'successful', label: 'Successful' },
  { value: 'pending', label: 'Pending' },
  { value: 'resolved', label: 'Resolved' },
];

const SMIPAY_STATUS_VALUES = SMIPAY_STATUSES.map((s) => s.value);
const SMIPAY_CREATE_STATUS_VALUES = ['successful', 'pending'];

const NETWORK_CATEGORIES = ['airtime', 'data'];

const dataDurationLabel = (value) =>
  SMIPAY_DATA_DURATIONS.find((d) => d.value === value)?.label || value || '';

const formatDataLabel = (gb) => {
  const n = Number(gb);
  if (Number.isNaN(n) || n <= 0) return '';
  if (n < 1) return `${Math.round(n * 1000)}MB`;
  if (Number.isInteger(n)) return `${n}GB`;
  return `${n}GB`;
};

const buildDataPlanLabel = (gb, duration) => {
  const size = formatDataLabel(gb);
  const dur = dataDurationLabel(duration);
  if (!size && !dur) return '';
  if (!size) return dur;
  if (!dur) return size;
  return `${size} · ${dur}`;
};

module.exports = {
  SMIPAY_NETWORKS,
  SMIPAY_NETWORK_VALUES,
  SMIPAY_DATA_PLANS,
  SMIPAY_DATA_DURATIONS,
  SMIPAY_DATA_DURATION_VALUES,
  SMIPAY_STATUSES,
  SMIPAY_STATUS_VALUES,
  SMIPAY_CREATE_STATUS_VALUES,
  NETWORK_CATEGORIES,
  dataDurationLabel,
  formatDataLabel,
  buildDataPlanLabel,
};
