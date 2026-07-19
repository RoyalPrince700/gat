import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Copy,
  Eye,
  Link2,
  MessageSquareText,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import api from '../api/client';
import {
  canUseSurveys,
  capitalizeFirst,
  emptyQuestion,
  emptySurveyForm,
  formatAnswerValue,
  QUESTION_TYPES,
  surveyPublicUrl,
  SURVEY_STATUSES,
} from '../constants/surveys';
import { useCompany } from '../context/CompanyContext';
import { formatNumber } from '../utils/format';

const needsOptions = (type) =>
  type === 'single_choice' || type === 'multiple_choice';

const AdminSurveys = () => {
  const { activeCompany } = useCompany();
  const companySlug = activeCompany?.slug;
  const surveysEnabled = canUseSurveys(companySlug);
  const companyParams = { company: companySlug };

  const [surveys, setSurveys] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(emptySurveyForm);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  const [panel, setPanel] = useState(null); // { mode: 'view'|'responses'|'analysis', survey }
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelData, setPanelData] = useState(null);

  const load = async () => {
    if (!surveysEnabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/smipay/surveys', { params: companyParams });
      setSurveys(res.data.surveys || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load surveys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companySlug, surveysEnabled]);

  const allTags = useMemo(() => {
    const set = new Set();
    surveys.forEach((s) => (s.tags || []).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [surveys]);

  const visibleSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (filterTag !== 'all' && !(s.tags || []).includes(filterTag)) {
        return false;
      }
      return true;
    });
  }, [surveys, filterStatus, filterTag]);

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onQuestionChange = (index, field, value) => {
    setForm((prev) => {
      const questions = prev.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      );
      return { ...prev, questions };
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      questions: [...prev.questions, emptyQuestion()],
    }));
  };

  const removeQuestion = (index) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setForm(emptySurveyForm());
    setShowForm(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      tags: form.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      questions: form.questions.map((q) => ({
        type: q.type,
        label: q.label.trim(),
        required: q.required,
        maxRating: q.type === 'rating' ? Number(q.maxRating) || 5 : undefined,
        options: needsOptions(q.type)
          ? q.optionsText
              .split('\n')
              .map((o) => capitalizeFirst(o.trim()))
              .filter(Boolean)
          : undefined,
      })),
    };

    try {
      await api.post('/smipay/surveys', { ...payload, company: companySlug });
      setSuccess('Survey created — copy the link to share it');
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create survey');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (survey) => {
    const url = surveyPublicUrl(survey.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(survey._id);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      window.prompt('Copy survey link:', url);
    }
  };

  const openPanel = async (mode, survey) => {
    setPanel({ mode, survey });
    setPanelData(null);
    setPanelLoading(true);
    setError('');
    try {
      if (mode === 'view') {
        const res = await api.get(`/smipay/surveys/${survey._id}`, {
          params: companyParams,
        });
        setPanelData(res.data);
      } else if (mode === 'responses') {
        const res = await api.get(`/smipay/surveys/${survey._id}/responses`, {
          params: companyParams,
        });
        setPanelData(res.data);
      } else if (mode === 'analysis') {
        const res = await api.get(`/smipay/surveys/${survey._id}/analysis`, {
          params: companyParams,
        });
        setPanelData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load details');
      setPanel(null);
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setPanel(null);
    setPanelData(null);
  };

  const onStatusChange = async (survey, status) => {
    try {
      await api.put(`/smipay/surveys/${survey._id}`, {
        status,
        company: companySlug,
      });
      await load();
      if (panel?.survey?._id === survey._id) {
        setPanel((p) => (p ? { ...p, survey: { ...p.survey, status } } : p));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status');
    }
  };

  const onDelete = async (survey) => {
    if (
      !window.confirm(
        `Delete "${survey.title}" and all ${survey.responseCount || 0} responses?`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/smipay/surveys/${survey._id}`, {
        params: companyParams,
      });
      if (panel?.survey?._id === survey._id) closePanel();
      await load();
      setSuccess('Survey deleted');
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  if (!surveysEnabled) {
    return (
      <div className="page">
        <p className="empty">
          Surveys are available for Smipay and Smart Edu Hub workspaces.
        </p>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <div className="page-header">
        <div>
          <h1>Surveys</h1>
          <p>
            Create surveys, share a link, collect responses, and review analysis.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true);
            setSuccess('');
          }}
        >
          <Plus size={16} />
          Add survey
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      {summary && (
        <div className="stats">
          <div className="stat">
            <div className="stat-label">Surveys</div>
            <div className="stat-value">{formatNumber(summary.total)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Active</div>
            <div className="stat-value">{formatNumber(summary.active)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Draft</div>
            <div className="stat-value">{formatNumber(summary.draft)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Total responses</div>
            <div className="stat-value">{formatNumber(summary.responses)}</div>
          </div>
        </div>
      )}

      {showForm && (
        <section className="panel survey-form-panel">
          <div className="panel-head">
            <h2>New survey</h2>
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Cancel
            </button>
          </div>
          <form className="stack" onSubmit={onSubmit}>
            <div className="form-grid">
              <label className="full">
                Title
                <input
                  name="title"
                  value={form.title}
                  onChange={onFormChange}
                  required
                  placeholder="e.g. Customer satisfaction Q3"
                />
              </label>
              <label className="full">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onFormChange}
                  rows={2}
                  placeholder="Short intro shown to respondents"
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={onFormChange}
                >
                  {SURVEY_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tags
                <input
                  name="tagsText"
                  value={form.tagsText}
                  onChange={onFormChange}
                  placeholder="Comma-separated, e.g. nps, customers"
                />
              </label>
            </div>

            <div className="survey-questions-builder">
              <div className="panel-head">
                <h3>Questions</h3>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={addQuestion}
                >
                  <Plus size={14} />
                  Add question
                </button>
              </div>

              {form.questions.map((q, index) => (
                <div key={index} className="survey-question-edit">
                  <div className="survey-question-edit-head">
                    <span>Question {index + 1}</span>
                    {form.questions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="form-grid">
                    <label>
                      Type
                      <select
                        value={q.type}
                        onChange={(e) =>
                          onQuestionChange(index, 'type', e.target.value)
                        }
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) =>
                          onQuestionChange(index, 'required', e.target.checked)
                        }
                      />
                      Required
                    </label>
                    <label className="full">
                      Question text
                      <input
                        value={q.label}
                        onChange={(e) =>
                          onQuestionChange(index, 'label', e.target.value)
                        }
                        required
                        placeholder="What would you like to ask?"
                      />
                    </label>
                    {needsOptions(q.type) && (
                      <label className="full">
                        Options (one per line)
                        <textarea
                          value={q.optionsText}
                          onChange={(e) =>
                            onQuestionChange(
                              index,
                              'optionsText',
                              e.target.value
                            )
                          }
                          rows={3}
                          required
                          placeholder={'Option A\nOption B\nOption C'}
                        />
                      </label>
                    )}
                    {q.type === 'rating' && (
                      <label>
                        Max rating
                        <input
                          type="number"
                          min={2}
                          max={10}
                          value={q.maxRating}
                          onChange={(e) =>
                            onQuestionChange(
                              index,
                              'maxRating',
                              e.target.value
                            )
                          }
                        />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="row-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Creating…' : 'Create survey'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="filters panel">
        <label>
          Status
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All</option>
            {SURVEY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tag
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <option value="all">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="empty">Loading surveys…</p>
      ) : visibleSurveys.length === 0 ? (
        <p className="empty">
          No surveys yet. Click “Add survey” to create one and share the link.
        </p>
      ) : (
        <div className="survey-list">
          {visibleSurveys.map((survey) => (
            <article key={survey._id} className="survey-card panel">
              <div className="survey-card-top">
                <div>
                  <div className="survey-card-title-row">
                    <h2>{survey.title}</h2>
                    <span className={`badge badge-${survey.status}`}>
                      {survey.status}
                    </span>
                    <span className="badge survey-response-badge">
                      {formatNumber(survey.responseCount || 0)} response
                      {(survey.responseCount || 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  {survey.description && (
                    <p className="survey-card-desc">{survey.description}</p>
                  )}
                  <div className="survey-tags">
                    {(survey.tags || []).map((tag) => (
                      <span key={tag} className="survey-tag">
                        {tag}
                      </span>
                    ))}
                    {!survey.tags?.length && (
                      <span className="muted-note">No tags</span>
                    )}
                  </div>
                  <div className="survey-card-meta">
                    {survey.questions?.length || 0} questions · Created{' '}
                    {survey.createdAt
                      ? new Date(survey.createdAt).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
                <label className="survey-status-select">
                  Status
                  <select
                    value={survey.status}
                    onChange={(e) => onStatusChange(survey, e.target.value)}
                  >
                    {SURVEY_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="row-actions survey-card-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => openPanel('view', survey)}
                >
                  <Eye size={14} />
                  View
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => openPanel('responses', survey)}
                >
                  <MessageSquareText size={14} />
                  Responses
                  <span className="survey-action-count">
                    {survey.responseCount || 0}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => openPanel('analysis', survey)}
                >
                  <BarChart3 size={14} />
                  Analysis
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyLink(survey)}
                >
                  {copiedId === survey._id ? (
                    <>Copied</>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy link
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onDelete(survey)}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {panel && (
        <div className="survey-drawer-backdrop" onClick={closePanel}>
          <aside
            className="survey-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="survey-drawer-head">
              <div>
                <p className="survey-drawer-mode">
                  {panel.mode === 'view' && 'Survey questions'}
                  {panel.mode === 'responses' && 'Responses'}
                  {panel.mode === 'analysis' && 'Analysis'}
                </p>
                <h2>{panel.survey.title}</h2>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closePanel}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {panel.mode !== 'view' && (
              <div className="survey-drawer-toolbar">
                <span className="badge survey-response-badge">
                  {formatNumber(
                    panelData?.total ??
                      panelData?.analysis?.totalResponses ??
                      panel.survey.responseCount ??
                      0
                  )}{' '}
                  responses
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => copyLink(panel.survey)}
                >
                  <Link2 size={14} />
                  Copy link
                </button>
              </div>
            )}

            {panelLoading && <p className="empty">Loading…</p>}

            {!panelLoading && panel.mode === 'view' && panelData && (
              <div className="survey-view-list">
                <p className="survey-card-desc">
                  {panelData.description || 'No description'}
                </p>
                <div className="survey-tags">
                  {(panelData.tags || []).map((tag) => (
                    <span key={tag} className="survey-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="muted-note" style={{ marginTop: '0.75rem' }}>
                  Link: {surveyPublicUrl(panelData.slug)}
                </p>
                {(panelData.questions || []).map((q, i) => (
                  <div key={q.id} className="survey-view-question">
                    <div className="survey-view-q-label">
                      {i + 1}. {q.label}
                      {q.required && <span className="required-mark">*</span>}
                    </div>
                    <div className="survey-view-q-meta">
                      {QUESTION_TYPES.find((t) => t.value === q.type)?.label ||
                        q.type}
                      {q.type === 'rating' && ` · 1–${q.maxRating || 5}`}
                    </div>
                    {(q.options || []).length > 0 && (
                      <ul className="survey-view-options">
                        {q.options.map((opt) => (
                          <li key={opt}>{capitalizeFirst(opt)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!panelLoading && panel.mode === 'responses' && panelData && (
              <div className="survey-responses-list">
                {(panelData.responses || []).length === 0 ? (
                  <p className="empty">No responses yet. Share the survey link.</p>
                ) : (
                  panelData.responses.map((res, idx) => (
                    <div key={res._id} className="survey-response-item">
                      <div className="survey-response-item-head">
                        <strong>Response #{panelData.total - idx}</strong>
                        <span>
                          {res.createdAt
                            ? new Date(res.createdAt).toLocaleString()
                            : ''}
                        </span>
                      </div>
                      <dl className="survey-answer-dl">
                        {(res.answers || []).map((a) => (
                          <div key={a.questionId}>
                            <dt>{a.label}</dt>
                            <dd>{formatAnswerValue(a.value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))
                )}
              </div>
            )}

            {!panelLoading && panel.mode === 'analysis' && panelData && (
              <div className="survey-analysis-list">
                {(panelData.analysis?.totalResponses || 0) === 0 ? (
                  <p className="empty">
                    No responses to analyse yet. Share the survey link to collect
                    answers.
                  </p>
                ) : (
                  (panelData.analysis.questions || []).map((q) => (
                    <section key={q.questionId} className="survey-analysis-block">
                      <h3>{q.label}</h3>
                      <p className="muted-note">
                        {QUESTION_TYPES.find((t) => t.value === q.type)?.label ||
                          q.type}{' '}
                        · {formatNumber(q.answered)} answered
                        {q.skipped ? ` · ${formatNumber(q.skipped)} skipped` : ''}
                        {q.average != null &&
                          ` · avg ${formatNumber(q.average)} / ${q.maxRating}`}
                      </p>

                      {q.distribution && (
                        <>
                          <div className="survey-chart-wrap">
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={q.distribution}>
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  vertical={false}
                                />
                                <XAxis dataKey="option" tick={{ fontSize: 11 }} />
                                <YAxis allowDecimals={false} width={32} />
                                <Tooltip />
                                <Bar
                                  dataKey="count"
                                  fill="var(--accent)"
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <ul className="survey-dist-list">
                            {q.distribution.map((d) => (
                              <li key={d.option}>
                                <span>{d.option}</span>
                                <span>
                                  {formatNumber(d.count)} ({d.pct}%)
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {q.samples && (
                        <ul className="survey-text-samples">
                          {q.samples.length === 0 ? (
                            <li className="muted-note">No text answers</li>
                          ) : (
                            q.samples.map((s, i) => (
                              <li key={`${s.submittedAt}-${i}`}>{s.value}</li>
                            ))
                          )}
                        </ul>
                      )}
                    </section>
                  ))
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};

export default AdminSurveys;
