/** Rating scale used for each Q&A row (documented in UI). */
const MAX_RATING = 5;
const MIN_RATING = 1;

const PRESET_METRICS = [
  'Depth of work / substance',
  'Contribution to department',
  'Contribution to company',
  'Ownership & accountability',
  'Initiative & problem-solving',
  'Communication & collaboration',
];

const STARTER_QUESTIONS = [
  'What are your main responsibilities week to week?',
  'What have you delivered in the last 30–90 days?',
  'How does your work help the department hit goals?',
  'How does it help the company?',
  'Where are you stuck or underutilized?',
];

/** Bands by average score percent (completed assessments only). */
const PERFORMANCE_BANDS = [
  { id: 'needs_attention', label: 'Needs attention', minPercent: 0, maxPercent: 49.999 },
  { id: 'solid', label: 'Solid', minPercent: 50, maxPercent: 74.999 },
  { id: 'strong', label: 'Strong', minPercent: 75, maxPercent: 100 },
];

const bandForPercent = (percent) => {
  const p = Number(percent);
  if (Number.isNaN(p) || p < 0) {
    return PERFORMANCE_BANDS[0];
  }
  if (p >= 75) return PERFORMANCE_BANDS[2];
  if (p >= 50) return PERFORMANCE_BANDS[1];
  return PERFORMANCE_BANDS[0];
};

const normalizeRating = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n < MIN_RATING || n > MAX_RATING) return null;
  return n;
};

const computeScores = (questions = []) => {
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

module.exports = {
  MAX_RATING,
  MIN_RATING,
  PRESET_METRICS,
  STARTER_QUESTIONS,
  PERFORMANCE_BANDS,
  bandForPercent,
  normalizeRating,
  computeScores,
};
