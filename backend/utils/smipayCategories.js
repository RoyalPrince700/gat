const SMIPAY_CATEGORIES = [
  { value: 'airtime', label: 'Airtime' },
  { value: 'data', label: 'Data' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'electricity', label: 'Electricity bill' },
  { value: 'exam_body', label: 'Exam body' },
  { value: 'cable_tv', label: 'Cable TV' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

const SMIPAY_CATEGORY_VALUES = SMIPAY_CATEGORIES.map((c) => c.value);

/** Kept for existing records; not offered in new entry UIs */
const SMIPAY_LEGACY_CATEGORIES = ['betting'];

module.exports = {
  SMIPAY_CATEGORIES,
  SMIPAY_CATEGORY_VALUES,
  SMIPAY_LEGACY_CATEGORIES,
};
