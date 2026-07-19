const ACQUISITION_SOURCES = [
  { value: 'organic', label: 'Organic' },
  { value: 'referral', label: 'Referral' },
  { value: 'agent', label: 'Agent' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'social', label: 'Social media' },
  { value: 'school', label: 'School / campus' },
  { value: 'other', label: 'Other' },
];

const ACQUISITION_SOURCE_VALUES = ACQUISITION_SOURCES.map((s) => s.value);

const FAILURE_REASONS = [
  { value: 'insufficient_funds', label: 'Insufficient funds' },
  { value: 'network_down', label: 'Network down' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'invalid_number', label: 'Invalid number' },
  { value: 'provider_error', label: 'Provider error' },
  { value: 'user_cancelled', label: 'User cancelled' },
  { value: 'other', label: 'Other' },
];

const FAILURE_REASON_VALUES = FAILURE_REASONS.map((r) => r.value);

const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'ussd', label: 'USSD' },
  { value: 'cash_agent', label: 'Cash to agent' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHOD_VALUES = PAYMENT_METHODS.map((m) => m.value);

/** Nigerian states + FCT for geo heatmaps */
const GEO_STATES = [
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

/** Default estimated margin % of volume when providerCost is not logged */
const DEFAULT_MARGIN_PCT = {
  airtime: 2,
  data: 3,
  deposit: 0,
  electricity: 1.5,
  exam_body: 2,
  cable_tv: 2,
  transfer: 0.5,
  other: 1,
  betting: 1,
};

const ALERT_THRESHOLDS = {
  airtimeWowDropPct: 20,
  pendingRatePct: 10,
  pendingOpenOver24h: 3,
  depositSpendDropPct: 15,
};

module.exports = {
  ACQUISITION_SOURCES,
  ACQUISITION_SOURCE_VALUES,
  FAILURE_REASONS,
  FAILURE_REASON_VALUES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_VALUES,
  GEO_STATES,
  DEFAULT_MARGIN_PCT,
  ALERT_THRESHOLDS,
};
