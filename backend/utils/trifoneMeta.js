const PRODUCT_CATEGORIES = [
  { value: 'tablet', label: 'Tablets' },
  { value: 'power_bank', label: 'Power banks' },
  { value: 'smart_electronics', label: 'Smart electronics' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
];

const SALE_CHANNELS = [
  { value: 'online', label: 'Online' },
  { value: 'retail', label: 'Retail' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'school', label: 'School' },
  { value: 'other', label: 'Other' },
];

const SALE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CUSTOMER_TYPES = [
  { value: 'distributor', label: 'Distributor' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'school', label: 'School' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'end_consumer', label: 'End consumer' },
  { value: 'other', label: 'Other' },
];

const ACQUISITION_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'outlet', label: 'Outlet' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

const DESTINATIONS = [
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
];

const PRODUCT_CATEGORY_VALUES = PRODUCT_CATEGORIES.map((s) => s.value);
const SALE_CHANNEL_VALUES = SALE_CHANNELS.map((s) => s.value);
const SALE_STATUS_VALUES = SALE_STATUSES.map((s) => s.value);
const CUSTOMER_TYPE_VALUES = CUSTOMER_TYPES.map((s) => s.value);
const ACQUISITION_SOURCE_VALUES = ACQUISITION_SOURCES.map((s) => s.value);
const DESTINATION_VALUES = DESTINATIONS.map((s) => s.value);

const WALK_IN_CUSTOMER_NAME = 'Walk-in / general';

module.exports = {
  PRODUCT_CATEGORIES,
  SALE_CHANNELS,
  SALE_STATUSES,
  CUSTOMER_TYPES,
  ACQUISITION_SOURCES,
  DESTINATIONS,
  PRODUCT_CATEGORY_VALUES,
  SALE_CHANNEL_VALUES,
  SALE_STATUS_VALUES,
  CUSTOMER_TYPE_VALUES,
  ACQUISITION_SOURCE_VALUES,
  DESTINATION_VALUES,
  WALK_IN_CUSTOMER_NAME,
};
