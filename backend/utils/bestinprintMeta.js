const PRINT_TYPES = [
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

const JOB_STATUSES = [
  { value: 'quote', label: 'Quote' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_production', label: 'In production' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CLIENT_TYPES = [
  { value: 'school', label: 'School' },
  { value: 'church', label: 'Church' },
  { value: 'business', label: 'Business' },
  { value: 'ngo', label: 'NGO' },
  { value: 'publisher', label: 'Publisher' },
  { value: 'individual', label: 'Individual' },
  { value: 'other', label: 'Other' },
];

const COLOUR_MODES = [
  { value: 'bw', label: 'Black & white' },
  { value: 'colour', label: 'Colour' },
  { value: 'mixed', label: 'Mixed' },
];

const PAPER_TYPES = [
  { value: 'matte', label: 'Matte' },
  { value: 'gloss', label: 'Gloss' },
  { value: 'bond', label: 'Bond' },
  { value: 'art', label: 'Art paper' },
  { value: 'newsprint', label: 'Newsprint' },
  { value: 'cardstock', label: 'Cardstock' },
  { value: 'other', label: 'Other' },
];

const ACQUISITION_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const PRINT_TYPE_VALUES = PRINT_TYPES.map((s) => s.value);
const JOB_STATUS_VALUES = JOB_STATUSES.map((s) => s.value);
const CLIENT_TYPE_VALUES = CLIENT_TYPES.map((s) => s.value);
const COLOUR_MODE_VALUES = COLOUR_MODES.map((s) => s.value);
const PAPER_TYPE_VALUES = PAPER_TYPES.map((s) => s.value);
const ACQUISITION_SOURCE_VALUES = ACQUISITION_SOURCES.map((s) => s.value);

module.exports = {
  PRINT_TYPES,
  JOB_STATUSES,
  CLIENT_TYPES,
  COLOUR_MODES,
  PAPER_TYPES,
  ACQUISITION_SOURCES,
  PRINT_TYPE_VALUES,
  JOB_STATUS_VALUES,
  CLIENT_TYPE_VALUES,
  COLOUR_MODE_VALUES,
  PAPER_TYPE_VALUES,
  ACQUISITION_SOURCE_VALUES,
};
