const BOOKING_TYPES = [
  { value: 'spot_ads', label: 'Spot ads' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'jingle', label: 'Jingle' },
  { value: 'live_mention', label: 'Live mention' },
  { value: 'show_sponsor', label: 'Show sponsor' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const BOOKING_STATUSES = [
  { value: 'lead', label: 'Lead' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'booked', label: 'Booked' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TIME_BELTS = [
  { value: 'morning', label: 'Morning' },
  { value: 'midday', label: 'Midday' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'all_day', label: 'All day' },
];

const ACQUISITION_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'agency', label: 'Agency' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const BOOKING_TYPE_VALUES = BOOKING_TYPES.map((s) => s.value);
const BOOKING_STATUS_VALUES = BOOKING_STATUSES.map((s) => s.value);
const TIME_BELT_VALUES = TIME_BELTS.map((s) => s.value);
const ACQUISITION_SOURCE_VALUES = ACQUISITION_SOURCES.map((s) => s.value);

const OXYGEN_SLUG = 'oxygen-fm';

module.exports = {
  BOOKING_TYPES,
  BOOKING_STATUSES,
  TIME_BELTS,
  ACQUISITION_SOURCES,
  BOOKING_TYPE_VALUES,
  BOOKING_STATUS_VALUES,
  TIME_BELT_VALUES,
  ACQUISITION_SOURCE_VALUES,
  OXYGEN_SLUG,
};
