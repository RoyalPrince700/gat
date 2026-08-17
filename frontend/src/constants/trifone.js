export const PRODUCT_CATEGORIES = [
  { value: 'tablet', label: 'Tablets' },
  { value: 'power_bank', label: 'Power banks' },
  { value: 'smart_electronics', label: 'Smart electronics' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
];

export const SALE_CHANNELS = [
  { value: 'online', label: 'Online' },
  { value: 'retail', label: 'Retail' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'school', label: 'School' },
  { value: 'other', label: 'Other' },
];

export const SALE_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const CUSTOMER_TYPES = [
  { value: 'distributor', label: 'Distributor' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'school', label: 'School' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'end_consumer', label: 'End consumer' },
  { value: 'other', label: 'Other' },
];

export const ACQUISITION_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'outlet', label: 'Outlet' },
  { value: 'social', label: 'Social' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

export const DESTINATIONS = [
  { value: 'home', label: 'Home' },
  { value: 'school', label: 'School' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
];

export const productCategoryLabel = (value) =>
  PRODUCT_CATEGORIES.find((s) => s.value === value)?.label || value || '—';

export const saleChannelLabel = (value) =>
  SALE_CHANNELS.find((s) => s.value === value)?.label || value || '—';

export const saleStatusLabel = (value) =>
  SALE_STATUSES.find((s) => s.value === value)?.label || value || '—';

export const customerTypeLabel = (value) =>
  CUSTOMER_TYPES.find((s) => s.value === value)?.label || value || '—';

export const acquisitionSourceLabel = (value) =>
  ACQUISITION_SOURCES.find((s) => s.value === value)?.label || value || '—';

export const destinationLabel = (value) =>
  DESTINATIONS.find((s) => s.value === value)?.label || value || '—';

export const TRIFONE_SLUG = 'trifone';
