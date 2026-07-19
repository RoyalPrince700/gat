export const SUBSCRIPTION_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const YES_NO_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export const statusLabel = (value) =>
  SUBSCRIPTION_STATUSES.find((s) => s.value === value)?.label || value || '—';

export const yesNoLabel = (value) => (value ? 'Yes' : 'No');

export const boolFromYesNo = (value) => value === 'yes' || value === true;

export const yesNoFromBool = (value) => (value ? 'yes' : 'no');

export const lifecycleLabel = (value) => {
  if (value === 'subscribed') return 'Subscribed';
  if (value === 'aware') return 'Aware';
  return value || '—';
};
