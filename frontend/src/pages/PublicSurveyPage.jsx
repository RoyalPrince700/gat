import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import smipayLogo from '../assets/smipaylogo.jpeg';
import { capitalizeFirst } from '../constants/surveys';
import { getThemeForSlug } from '../constants/themes';

const PublicSurveyPage = () => {
  const { slug } = useParams();
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [unavailable, setUnavailable] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      setUnavailable('');
      try {
        const res = await api.get(`/smipay/surveys/public/${slug}`);
        if (!cancelled) {
          setSurvey(res.data);
          const initial = {};
          (res.data.questions || []).forEach((q) => {
            if (q.type === 'multiple_choice') initial[q.id] = [];
            else initial[q.id] = '';
          });
          setAnswers(initial);
        }
      } catch (err) {
        if (!cancelled) {
          setUnavailable(
            err.response?.data?.message || 'Survey not available'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const companySlug = survey?.companySlug || 'smipay';
  const theme = getThemeForSlug(companySlug);
  const brand = theme.brandHtml;
  const isSmipay = companySlug === 'smipay';

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMulti = (questionId, option) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: next };
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        answers: (survey.questions || []).map((q) => ({
          questionId: q.id,
          value: answers[q.id],
        })),
      };
      await api.post(`/smipay/surveys/public/${slug}/respond`, payload);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const brandMark = isSmipay ? (
    <div className="public-survey-brand">
      <img src={smipayLogo} alt="SmiPay" className="public-survey-logo" />
    </div>
  ) : (
    <div className="public-survey-brand">
      {brand.primary}
      {brand.accent ? <span>{brand.accent}</span> : null}
    </div>
  );

  if (loading) {
    return (
      <div className="public-survey-page">
        <div className="public-survey-card">
          <p className="empty">Loading survey…</p>
        </div>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="public-survey-page">
        <div className="public-survey-card">
          <h1>Survey unavailable</h1>
          <p className="lede">{unavailable}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div
        className={`public-survey-page public-survey-${theme.id}`}
        style={{
          '--survey-accent': theme.accent,
          '--survey-accent-soft': theme.accentSoft,
          '--survey-bg': theme.bg,
        }}
      >
        <div className="public-survey-card public-survey-thanks">
          {brandMark}
          <h1>Thank you</h1>
          <p className="lede">Your response has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`public-survey-page public-survey-${theme.id}`}
      style={{
        '--survey-accent': theme.accent,
        '--survey-accent-soft': theme.accentSoft,
        '--survey-bg': theme.bg,
      }}
    >
      <div className="public-survey-card">
        {brandMark}
        <h1>{survey.title}</h1>
        {survey.description && <p className="lede">{survey.description}</p>}

        {error && <p className="error">{error}</p>}

        <form className="public-survey-form" onSubmit={onSubmit}>
          {(survey.questions || []).map((q, index) => (
            <fieldset key={q.id} className="public-survey-question">
              <legend>
                {index + 1}. {q.label}
                {q.required && <span className="required-mark"> *</span>}
              </legend>

              {(q.type === 'short_text' || q.type === 'long_text') &&
                (q.type === 'long_text' ? (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    rows={4}
                    required={q.required}
                  />
                ) : (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    required={q.required}
                  />
                ))}

              {(q.type === 'single_choice' || q.type === 'yes_no') && (
                <div className="public-survey-options">
                  {(q.options || []).map((opt) => {
                    const label = capitalizeFirst(opt);
                    return (
                      <label key={opt} className="public-survey-option">
                        <input
                          type="radio"
                          name={q.id}
                          value={label}
                          checked={answers[q.id] === label}
                          onChange={() => setAnswer(q.id, label)}
                          required={q.required}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === 'multiple_choice' && (
                <div className="public-survey-options">
                  {(q.options || []).map((opt) => {
                    const label = capitalizeFirst(opt);
                    return (
                      <label key={opt} className="public-survey-option">
                        <input
                          type="checkbox"
                          checked={(answers[q.id] || []).includes(label)}
                          onChange={() => toggleMulti(q.id, label)}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === 'rating' && (
                <div className="public-survey-rating">
                  {Array.from(
                    { length: q.maxRating || 5 },
                    (_, i) => i + 1
                  ).map((n) => (
                    <label key={n} className="public-survey-rating-opt">
                      <input
                        type="radio"
                        name={q.id}
                        value={n}
                        checked={Number(answers[q.id]) === n}
                        onChange={() => setAnswer(q.id, n)}
                        required={q.required}
                      />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit response'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicSurveyPage;
