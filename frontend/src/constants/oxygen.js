export const BOOKING_TYPES = [
  { value: 'spot_ads', label: 'Spot ads' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'jingle', label: 'Jingle' },
  { value: 'live_mention', label: 'Live mention' },
  { value: 'show_sponsor', label: 'Show sponsor' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

export const BOOKING_STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'booked', label: 'Booked' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const TIME_BELTS = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'all_day', label: 'All day' },
];

export const ACQUISITION_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'agency', label: 'Agency' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

export const bookingTypeLabel = (value) =>
  BOOKING_TYPES.find((s) => s.value === value)?.label || value || '—';

export const bookingStatusLabel = (value) =>
  BOOKING_STATUSES.find((s) => s.value === value)?.label || value || '—';

export const timeBeltLabel = (value) =>
  TIME_BELTS.find((s) => s.value === value)?.label || value || '—';

export const acquisitionSourceLabel = (value) =>
  ACQUISITION_SOURCES.find((s) => s.value === value)?.label || value || '—';

export const OXYGEN_SLUG = 'oxygen-fm';
