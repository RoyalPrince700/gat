const COST_CATEGORIES = [
  {
    value: 'activation',
    label: 'Activation',
    description: 'Spend to acquire and activate new users',
  },
  {
    value: 'retention',
    label: 'Retention',
    description: 'Spend to keep users active and returning',
  },
  {
    value: 'brand_marketing',
    label: 'Brand & marketing',
    description: 'Awareness, campaigns, and brand building',
  },
  {
    value: 'partnerships',
    label: 'Partnerships',
    description: 'Partner deals, campus programs, affiliates',
  },
  {
    value: 'operations',
    label: 'Operations',
    description: 'Ops and support costs tied to growth',
  },
  {
    value: 'product',
    label: 'Product',
    description: 'Product incentives or growth-related product spend',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Uncategorized growth spend',
  },
];

const COST_CATEGORY_VALUES = COST_CATEGORIES.map((c) => c.value);

module.exports = {
  COST_CATEGORIES,
  COST_CATEGORY_VALUES,
};
