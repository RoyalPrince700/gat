export const PRINT_TYPES = [
  { value: 'books', label: 'Books' },
  { value: 'fliers', label: 'Fliers' },
  { value: 'brochures', label: 'Brochures' },
  { value: 'posters', label: 'Posters' },
  { value: 'banners', label: 'Banners' },
  { value: 'business_cards', label: 'Business cards' },
  { value: 'notebooks', label: 'Notebooks' },
  { value: 'calendars', label: 'Calendars' },
  { value: 'stickers', label: 'Stickers' },
  { value: 'other', label: 'Other' },
];

export const JOB_STATUSES = [
  { value: 'quote', label: 'Quote' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_production', label: 'In production' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const CLIENT_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'church', label: 'Church' },
  { value: 'business', label: 'Business' },
  { value: 'ngo', label: 'NGO' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'individual', label: 'Individual' },
  { value: 'other', label: 'Other' },
];

export const COLOUR_MODES = [
  { value: 'bw', label: 'Black & white' },
  { value: 'colour', label: 'Colour' },
  { value: 'mixed', label: 'Mixed' },
];

export const PAPER_TYPES = [
  { value: 'matte', label: 'Matte' },
  { value: 'gloss', label: 'Gloss' },
  { value: 'bond', label: 'Bond' },
  { value: 'art', label: 'Art paper' },
  { value: 'newsprint', label: 'Newsprint' },
  { value: 'cardstock', label: 'Cardstock' },
  { value: 'other', label: 'Other' },
];

export const ACQUISITION_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

export const printTypeLabel = (value) =>
  PRINT_TYPES.find((s) => s.value === value)?.label || value || '—';

export const jobStatusLabel = (value) =>
  JOB_STATUSES.find((s) => s.value === value)?.label || value || '—';

export const clientTypeLabel = (value) =>
  CLIENT_TYPES.find((s) => s.value === value)?.label || value || '—';

export const colourModeLabel = (value) =>
  COLOUR_MODES.find((s) => s.value === value)?.label || value || '—';

export const paperTypeLabel = (value) =>
  PAPER_TYPES.find((s) => s.value === value)?.label || value || '—';

export const acquisitionSourceLabel = (value) =>
  ACQUISITION_SOURCES.find((s) => s.value === value)?.label || value || '—';

export const BEST_IN_PRINT_SLUG = 'best-in-print';
