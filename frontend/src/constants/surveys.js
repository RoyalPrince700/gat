export const SURVEY_COMPANY_SLUGS = new Set(['smipay', 'smart-edu-hub']);

export const canUseSurveys = (companySlug) =>
  SURVEY_COMPANY_SLUGS.has(companySlug);

export const QUESTION_TYPES = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'rating', label: 'Rating' },
];

export const SURVEY_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

export const emptyQuestion = () => ({
  type: 'short_text',
  label: '',
  required: true,
  optionsText: '',
  maxRating: 5,
});

export const emptySurveyForm = () => ({
  title: '',
  description: '',
  status: 'active',
  tagsText: '',
  questions: [emptyQuestion()],
});

/** Prefill the admin form from an existing survey (keeps question ids). */
export const surveyToForm = (survey) => ({
  title: survey?.title || '',
  description: survey?.description || '',
  status: survey?.status || 'active',
  tagsText: (survey?.tags || []).join(', '),
  questions:
    survey?.questions?.length > 0
      ? survey.questions.map((q) => ({
          id: q.id,
          type: q.type || 'short_text',
          label: q.label || '',
          required: q.required !== false,
          optionsText: (q.options || []).join('\n'),
          maxRating: q.maxRating || 5,
        }))
      : [emptyQuestion()],
});

/** Capitalize the first letter of a string (leave the rest unchanged). */
export const capitalizeFirst = (text) => {
  const s = String(text ?? '');
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const formatAnswerValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => capitalizeFirst(v)).join(', ');
  }
  if (value == null) return '—';
  return capitalizeFirst(value);
};

export const surveyPublicUrl = (slug) => {
  if (typeof window === 'undefined') return `/survey/${slug}`;
  return `${window.location.origin}/survey/${slug}`;
};
