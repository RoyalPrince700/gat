const { SOCIAL_MEDIA_PLATFORM_VALUES } = require('./socialMediaPlatforms');
const { SMIPAY_CATEGORY_VALUES } = require('./smipayCategories');

const KPI_PERIODS = [
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'month', label: 'Per month' },
];

const KPI_PERIOD_VALUES = KPI_PERIODS.map((p) => p.value);

const KPI_METRICS = [
  {
    value: 'new_users',
    label: 'New users',
    description: 'Customers who joined in the period',
    unit: 'count',
  },
  {
    value: 'transaction_volume',
    label: 'Transaction volume',
    description: 'Total transaction amount (₦)',
    unit: 'money',
  },
  {
    value: 'transaction_count',
    label: 'Transaction count',
    description: 'Number of transactions recorded',
    unit: 'count',
  },
  {
    value: 'avg_ticket',
    label: 'Average ticket size',
    description: 'Average amount per transaction',
    unit: 'money',
  },
  {
    value: 'active_customers',
    label: 'Active customers',
    description: 'Distinct customers with a transaction in the period',
    unit: 'count',
  },
  {
    value: 'deposit_volume',
    label: 'Deposit volume',
    description: 'Total deposit category volume (₦)',
    unit: 'money',
  },
  {
    value: 'airtime_volume',
    label: 'Airtime volume',
    description: 'Total airtime category volume (₦)',
    unit: 'money',
  },
  {
    value: 'data_volume',
    label: 'Data volume',
    description: 'Total data category volume (₦)',
    unit: 'money',
  },
  {
    value: 'social_followers',
    label: 'Social media new followers',
    description: 'New followers logged for the period',
    unit: 'count',
    supportsPlatform: true,
  },
  {
    value: 'category_volume',
    label: 'Category volume',
    description: 'Volume for a selected transaction category (₦)',
    unit: 'money',
    supportsCategory: true,
  },
];

const KPI_METRIC_VALUES = KPI_METRICS.map((m) => m.value);

const KPI_PLATFORM_VALUES = ['all', ...SOCIAL_MEDIA_PLATFORM_VALUES];

module.exports = {
  KPI_PERIODS,
  KPI_PERIOD_VALUES,
  KPI_METRICS,
  KPI_METRIC_VALUES,
  KPI_PLATFORM_VALUES,
  SMIPAY_CATEGORY_VALUES,
};
