const SERVICE_LINES = [
  { value: 'software', label: 'Software' },
  { value: 'digital_marketing', label: 'Digital marketing' },
  { value: 'both', label: 'Both' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

const SERVICE_TYPES = [
  { value: 'custom_software', label: 'Custom software' },
  { value: 'web_app', label: 'Web app' },
  { value: 'mobile_app', label: 'Mobile app' },
  { value: 'saas', label: 'SaaS' },
  { value: 'seo_ppc', label: 'SEO / PPC' },
  { value: 'social_media', label: 'Social media' },
  { value: 'branding', label: 'Branding' },
  { value: 'content', label: 'Content' },
  { value: 'marketing_strategy', label: 'Marketing strategy' },
  { value: 'digital_transformation', label: 'Digital transformation' },
  { value: 'it_consulting', label: 'IT consulting' },
  { value: 'training', label: 'Training' },
  { value: 'other', label: 'Other' },
];

const PROJECT_STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ACQUISITION_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const SERVICE_LINE_VALUES = SERVICE_LINES.map((s) => s.value);
const SERVICE_TYPE_VALUES = SERVICE_TYPES.map((s) => s.value);
const PROJECT_STATUS_VALUES = PROJECT_STATUSES.map((s) => s.value);
const ACQUISITION_SOURCE_VALUES = ACQUISITION_SOURCES.map((s) => s.value);

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
  SERVICE_LINES,
  SERVICE_TYPES,
  PROJECT_STATUSES,
  ACQUISITION_SOURCES,
  SERVICE_LINE_VALUES,
  SERVICE_TYPE_VALUES,
  PROJECT_STATUS_VALUES,
  ACQUISITION_SOURCE_VALUES,
  parseBool,
};
