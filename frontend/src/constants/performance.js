/** Rating scale for each assessment Q&A row. */
export const MAX_RATING = 5;
export const MIN_RATING = 1;

export const PRESET_METRICS = [
  'Depth of work / substance',
  'Contribution to department',
  'Contribution to company',
  'Ownership & accountability',
  'Initiative & problem-solving',
  'Communication & collaboration',
];

export const STARTER_QUESTIONS = [
  'What are your main responsibilities week to week?',
  'What have you delivered in the last 30–90 days?',
  'How does your work help the department hit goals?',
  'How does it help the company?',
  'Where are you stuck or underutilized?',
];

export const DEPARTMENT_PRESETS = [
  'Finance',
  'Ops',
  'Sales',
  'Tech',
  'Marketing',
  'HR',
  'Admin',
  'Customer Success',
  'Other',
];

/**
 * Bands by average score percent (completed assessments only).
 * Needs attention: < 50 · Solid: 50–74 · Strong: ≥ 75
 */
export const PERFORMANCE_BANDS = [
  {
    id: 'needs_attention',
    label: 'Needs attention',
    minPercent: 0,
    maxPercent: 49.999,
  },
  { id: 'solid', label: 'Solid', minPercent: 50, maxPercent: 74.999 },
  { id: 'strong', label: 'Strong', minPercent: 75, maxPercent: 100 },
];

export const bandForPercent = (percent) => {
  const p = Number(percent);
  if (Number.isNaN(p) || p < 0) return PERFORMANCE_BANDS[0];
  if (p >= 75) return PERFORMANCE_BANDS[2];
  if (p >= 50) return PERFORMANCE_BANDS[1];
  return PERFORMANCE_BANDS[0];
};

export const bandBadgeClass = (bandId) => {
  if (bandId === 'strong') return 'badge-completed';
  if (bandId === 'solid') return 'badge-active';
  if (bandId === 'needs_attention') return 'badge-pending';
  return '';
};

export const emptyQuestion = (prompt = '') => ({
  prompt,
  answer: '',
  metric: PRESET_METRICS[0],
  rating: 3,
});

export const computeLiveScores = (questions = []) => {
  const totalScore = questions.reduce(
    (sum, q) => sum + (Number(q.rating) || 0),
    0
  );
  const maxPossibleScore = questions.length * MAX_RATING;
  const scorePercent =
    maxPossibleScore > 0
      ? Math.round((totalScore / maxPossibleScore) * 1000) / 10
      : 0;
  return { totalScore, maxPossibleScore, scorePercent };
};
