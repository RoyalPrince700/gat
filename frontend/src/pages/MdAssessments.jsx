import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import {
  MAX_RATING,
  MIN_RATING,
  PRESET_METRICS,
  STARTER_QUESTIONS,
  bandForPercent,
  computeLiveScores,
  emptyQuestion,
} from '../constants/performance';
import { hubRootFromPathname } from '../constants/themes';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const todayIso = () => new Date().toISOString().slice(0, 10);

const MdAssessments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hubRoot = hubRootFromPathname(location.pathname);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const staffPrefill = searchParams.get('staff');
  const { ALL_COMPANIES, switchCompany } = useCompany();

  const [staffList, setStaffList] = useState([]);
  const [staffId, setStaffId] = useState(staffPrefill || '');
  const [meetingDate, setMeetingDate] = useState(todayIso());
  const [overallNotes, setOverallNotes] = useState('');
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [customMetricFlags, setCustomMetricFlags] = useState([false]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadedStatus, setLoadedStatus] = useState(null);

  const scores = useMemo(() => computeLiveScores(questions), [questions]);
  const selectedStaff = useMemo(
    () => staffList.find((s) => s._id === staffId) || null,
    [staffList, staffId]
  );

  useEffect(() => {
    switchCompany(ALL_COMPANIES);
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data: list } = await api.get('/staff', {
          params: { status: 'active' },
        });
        if (cancelled) return;
        let nextList = list;

        if (editId) {
          const { data } = await api.get(`/performance/assessments/${editId}`);
          if (cancelled) return;
          const attached = data.staff;
          if (
            attached?._id &&
            !nextList.some((s) => s._id === attached._id)
          ) {
            nextList = [
              {
                _id: attached._id,
                name: attached.name,
                department: attached.department,
                jobTitle: attached.jobTitle,
                email: attached.email,
                company: attached.company,
                status: attached.status,
              },
              ...nextList,
            ];
          }
          setStaffList(nextList);
          setStaffId(attached?._id || '');
          setMeetingDate(
            data.meetingDate
              ? new Date(data.meetingDate).toISOString().slice(0, 10)
              : todayIso()
          );
          setOverallNotes(data.overallNotes || '');
          const qs =
            data.questions?.length > 0
              ? data.questions.map((q) => ({
                  prompt: q.prompt || '',
                  answer: q.answer || '',
                  metric: q.metric || PRESET_METRICS[0],
                  rating: q.rating ?? 3,
                }))
              : [emptyQuestion()];
          setQuestions(qs);
          setCustomMetricFlags(
            qs.map((q) => !PRESET_METRICS.includes(q.metric))
          );
          setLoadedStatus(data.status);
        } else {
          setStaffList(nextList);
          if (staffPrefill && nextList.some((s) => s._id === staffPrefill)) {
            setStaffId(staffPrefill);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || 'Failed to load assessment data'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const updateQuestion = (index, patch) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  const addQuestion = (prompt = '') => {
    setQuestions((prev) => [...prev, emptyQuestion(prompt)]);
    setCustomMetricFlags((prev) => [...prev, false]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setCustomMetricFlags((prev) => prev.filter((_, i) => i !== index));
  };

  const insertStarters = () => {
    const starters = STARTER_QUESTIONS.map((p) => emptyQuestion(p));
    const onlyBlank =
      questions.length === 1 &&
      !questions[0].prompt &&
      !questions[0].answer &&
      Number(questions[0].rating) === 3;
    setQuestions(onlyBlank ? starters : [...questions, ...starters]);
    setCustomMetricFlags(
      onlyBlank
        ? starters.map(() => false)
        : [...customMetricFlags, ...starters.map(() => false)]
    );
  };

  const save = async (status) => {
    setSaving(true);
    setError('');
    setSuccess('');
    if (!staffId) {
      setError('Select a staff member first');
      setSaving(false);
      return;
    }
    if (questions.length === 0) {
      setError('Add at least one question with a rating');
      setSaving(false);
      return;
    }
    const payload = {
      staff: staffId,
      meetingDate,
      overallNotes,
      status,
      questions: questions.map((q) => ({
        prompt: q.prompt,
        answer: q.answer,
        metric: q.metric,
        rating: Number(q.rating),
      })),
    };
    try {
      if (editId) {
        await api.put(`/performance/assessments/${editId}`, payload);
        setSuccess(
          status === 'completed'
            ? 'Assessment completed'
            : 'Draft assessment saved'
        );
        setLoadedStatus(status);
      } else {
        const { data } = await api.post('/performance/assessments', payload);
        setSuccess(
          status === 'completed'
            ? 'Assessment completed'
            : 'Draft assessment saved'
        );
        navigate(`${hubRoot}/assessments?edit=${data._id}`, { replace: true });
      }
      if (status === 'completed') {
        setTimeout(() => navigate(`${hubRoot}/scorecards`), 800);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save assessment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page page-full">
        <p className="empty">Loading assessment…</p>
      </div>
    );
  }

  return (
    <div className="page page-full">
      <div className="page-header">
        <div>
          <h1>{editId ? 'Edit assessment' : 'Conduct assessment'}</h1>
          <p>
            Interview-first performance review. Rate each answer on a scale of{' '}
            {MIN_RATING}–{MAX_RATING}. Totals update as you score.
            {isAdmin
              ? ' Same tools as MD — enter meeting assessments and review scorecards here.'
              : ''}
            {loadedStatus ? (
              <>
                {' '}
                Status:{' '}
                <span
                  className={`badge badge-status ${
                    loadedStatus === 'completed'
                      ? 'badge-completed'
                      : 'badge-draft'
                  }`}
                >
                  {loadedStatus}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="page-header-actions">
          <Link to={`${hubRoot}/scorecards`} className="btn btn-ghost">
            Scorecards
          </Link>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {success && (
        <p
          className="hint"
          style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}
        >
          {success}
        </p>
      )}

      {staffList.length === 0 ? (
        <section className="panel">
          <p className="empty">
            No active staff in the directory yet. Ask an admin to add staff
            under Admin → Staff before you can run assessments.
          </p>
        </section>
      ) : (
        <div className="page-stack">
          <section className="panel">
            <div className="panel-head">
              <h2>1. Staff & meeting</h2>
            </div>
            <div className="form-grid">
              <label className="full">
                Staff member
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                >
                  <option value="">Select staff…</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                      {s.department ? ` · ${s.department}` : ''}
                      {s.company?.name ? ` · ${s.company.name}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Meeting date
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </label>
              {selectedStaff && (
                <div className="full">
                  <p
                    className="hint"
                    style={{ margin: 0, borderTop: 'none', paddingTop: 0 }}
                  >
                    <strong>{selectedStaff.name}</strong>
                    {selectedStaff.jobTitle
                      ? ` · ${selectedStaff.jobTitle}`
                      : ''}
                    <br />
                    Department: {selectedStaff.department || '—'}
                    {selectedStaff.company?.name
                      ? ` · Company: ${selectedStaff.company.name}`
                      : ''}
                    {selectedStaff.email ? ` · ${selectedStaff.email}` : ''}
                  </p>
                </div>
              )}
              <label className="full">
                Overall notes (after meeting)
                <textarea
                  rows={3}
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  placeholder="Summary of the conversation, next steps…"
                />
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>2. Questions & ratings</h2>
              <div className="stack-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={insertStarters}
                >
                  Insert starter questions
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => addQuestion()}
                >
                  Add question
                </button>
              </div>
            </div>

            <div className="stats" style={{ marginBottom: '1rem' }}>
              <div className="stat">
                <div className="stat-label">Total score</div>
                <div className="stat-value">
                  {scores.totalScore}
                  <span style={{ fontSize: '0.55em', fontWeight: 500 }}>
                    {' '}
                    / {scores.maxPossibleScore}
                  </span>
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Score %</div>
                <div className="stat-value">{scores.scorePercent}%</div>
              </div>
              <div className="stat">
                <div className="stat-label">Band (this meeting)</div>
                <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                  {questions.length > 0
                    ? bandForPercent(scores.scorePercent).label
                    : '—'}
                </div>
              </div>
            </div>

            <div className="stack">
              {questions.map((q, index) => {
                const useCustom = customMetricFlags[index];
                return (
                  <div
                    key={index}
                    className="panel"
                    style={{ boxShadow: 'none', margin: 0 }}
                  >
                    <div className="panel-head">
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>
                        Question {index + 1}
                      </h3>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => removeQuestion(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="form-grid">
                      <label className="full">
                        Question
                        <input
                          value={q.prompt}
                          onChange={(e) =>
                            updateQuestion(index, { prompt: e.target.value })
                          }
                          placeholder="What did you ask?"
                        />
                      </label>
                      <label className="full">
                        Answer notes
                        <textarea
                          rows={2}
                          value={q.answer}
                          onChange={(e) =>
                            updateQuestion(index, { answer: e.target.value })
                          }
                          placeholder="Staff response notes"
                        />
                      </label>
                      <label>
                        Metric / criterion
                        {useCustom ? (
                          <input
                            value={q.metric}
                            onChange={(e) =>
                              updateQuestion(index, { metric: e.target.value })
                            }
                            placeholder="Custom metric label"
                          />
                        ) : (
                          <select
                            value={
                              PRESET_METRICS.includes(q.metric)
                                ? q.metric
                                : PRESET_METRICS[0]
                            }
                            onChange={(e) => {
                              if (e.target.value === '__custom__') {
                                setCustomMetricFlags((prev) =>
                                  prev.map((f, i) => (i === index ? true : f))
                                );
                                updateQuestion(index, { metric: '' });
                              } else {
                                updateQuestion(index, {
                                  metric: e.target.value,
                                });
                              }
                            }}
                          >
                            {PRESET_METRICS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                            <option value="__custom__">Custom…</option>
                          </select>
                        )}
                        {useCustom && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ marginTop: 4 }}
                            onClick={() => {
                              setCustomMetricFlags((prev) =>
                                prev.map((f, i) => (i === index ? false : f))
                              );
                              updateQuestion(index, {
                                metric: PRESET_METRICS[0],
                              });
                            }}
                          >
                            Use preset
                          </button>
                        )}
                      </label>
                      <label>
                        Rating ({MIN_RATING}–{MAX_RATING})
                        <select
                          value={q.rating}
                          onChange={(e) =>
                            updateQuestion(index, {
                              rating: Number(e.target.value),
                            })
                          }
                        >
                          {Array.from(
                            { length: MAX_RATING - MIN_RATING + 1 },
                            (_, i) => MIN_RATING + i
                          ).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="stack-actions" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => addQuestion()}
              >
                Add question
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={saving}
                onClick={() => save('draft')}
              >
                {saving ? 'Saving…' : 'Save as draft'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving}
                onClick={() => save('completed')}
              >
                {saving ? 'Saving…' : 'Mark completed'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default MdAssessments;
