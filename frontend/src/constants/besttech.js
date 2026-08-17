export const SERVICE_LINES = [
  { value: 'software', label: 'Software' },
  { value: 'digital_marketing', label: 'Digital marketing' },
  { value: 'both', label: 'Both' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

export const SERVICE_TYPES = [
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

export const PROJECT_STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ACQUISITION_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

export const serviceLineLabel = (value) =>
  SERVICE_LINES.find((s) => s.value === value)?.label || value || '—';

export const serviceTypeLabel = (value) =>
  SERVICE_TYPES.find((s) => s.value === value)?.label || value || '—';

export const projectStatusLabel = (value) =>
  PROJECT_STATUSES.find((s) => s.value === value)?.label || value || '—';

export const acquisitionSourceLabel = (value) =>
  ACQUISITION_SOURCES.find((s) => s.value === value)?.label || value || '—';

export const BESTTECH_SLUG = 'best-technology-it';
