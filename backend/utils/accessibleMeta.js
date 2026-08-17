const ACCESSIBLE_CATEGORIES = [
  { value: 'physical_print', label: 'Physical print' },
  { value: 'audio_books', label: 'Audio books' },
  { value: 'ebooks', label: 'E-books' },
  { value: 'content_animations', label: 'Content animations' },
  { value: 'braille', label: 'Braille' },
  { value: 'printing_services', label: 'Printing services' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'other', label: 'Other' },
];

const ACCESSIBLE_LEVELS = [
  { value: 'elementary', label: 'Elementary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'tertiary', label: 'Tertiary' },
  { value: 'general', label: 'General' },
];

const ACCESSIBLE_CATEGORY_VALUES = ACCESSIBLE_CATEGORIES.map((c) => c.value);
const ACCESSIBLE_LEVEL_VALUES = ACCESSIBLE_LEVELS.map((l) => l.value);

const ACCESSIBLE_SLUG = 'accessible-publishers';

/** Academic seasons for school book-purchase history (loyalty data foundation). */
const ACCESSIBLE_SEASONS = ['2023-2024', '2024-2025', '2025-2026'];

module.exports = {
  ACCESSIBLE_CATEGORIES,
  ACCESSIBLE_LEVELS,
  ACCESSIBLE_CATEGORY_VALUES,
  ACCESSIBLE_LEVEL_VALUES,
  ACCESSIBLE_SLUG,
  ACCESSIBLE_SEASONS,
};
