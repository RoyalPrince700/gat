const express = require('express');
const crypto = require('crypto');
const SmipaySurvey = require('../models/SmipaySurvey');
const { QUESTION_TYPES } = require('../models/SmipaySurvey');
const SmipaySurveyResponse = require('../models/SmipaySurveyResponse');
const Company = require('../models/Company');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

const SURVEY_COMPANY_SLUGS = new Set(['smipay', 'smart-edu-hub']);

const resolveCompany = async (req) => {
  const raw =
    req.query.company ||
    req.body?.company ||
    req.headers['x-company-slug'] ||
    'smipay';
  const slug = String(raw).trim();
  if (!SURVEY_COMPANY_SLUGS.has(slug)) {
    return { error: 'Surveys are only available for Smipay and Smart Edu Hub' };
  }
  const company = await Company.findOne({ slug });
  if (!company) {
    return { error: 'Company not found' };
  }
  return { company };
};

const CHOICE_TYPES = new Set(['single_choice', 'multiple_choice', 'yes_no']);

const capitalizeFirst = (text) => {
  const s = String(text ?? '');
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const makeSlug = () => crypto.randomBytes(8).toString('hex');

const makeQuestionId = () => crypto.randomBytes(6).toString('hex');

const normalizeTags = (tags) => {
  if (!tags) return [];
  const list = Array.isArray(tags)
    ? tags
    : String(tags)
        .split(',')
        .map((t) => t.trim());
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))].slice(
    0,
    12
  );
};

const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { error: 'Add at least one question' };
  }

  const normalized = [];
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i] || {};
    const type = q.type;
    const label = String(q.label || '').trim();

    if (!QUESTION_TYPES.includes(type)) {
      return { error: `Invalid question type on question ${i + 1}` };
    }
    if (!label) {
      return { error: `Question ${i + 1} needs a label` };
    }

    const item = {
      id: q.id && String(q.id).trim() ? String(q.id).trim() : makeQuestionId(),
      type,
      label,
      required: q.required !== false && q.required !== 'false',
    };

    if (type === 'yes_no') {
      item.options = ['Yes', 'No'];
    } else if (CHOICE_TYPES.has(type)) {
      const options = (Array.isArray(q.options) ? q.options : [])
        .map((o) => capitalizeFirst(String(o || '').trim()))
        .filter(Boolean);
      if (options.length < 2) {
        return {
          error: `Question "${label}" needs at least two options`,
        };
      }
      item.options = options;
    }

    if (type === 'rating') {
      const max = Number(q.maxRating || 5);
      if (!Number.isFinite(max) || max < 2 || max > 10) {
        return { error: `Question "${label}" rating scale must be 2–10` };
      }
      item.maxRating = max;
    }

    normalized.push(item);
  }

  return { questions: normalized };
};

const validateSurveyBody = (body, { partial = false } = {}) => {
  const title = body.title != null ? String(body.title).trim() : undefined;
  const description =
    body.description != null ? String(body.description).trim() : undefined;
  const status = body.status;
  const tags = body.tags !== undefined ? normalizeTags(body.tags) : undefined;

  if (!partial && !title) {
    return { error: 'Title is required' };
  }
  if (title !== undefined && !title) {
    return { error: 'Title is required' };
  }
  if (
    status !== undefined &&
    !['draft', 'active', 'closed'].includes(status)
  ) {
    return { error: 'Invalid status' };
  }

  let questions;
  if (body.questions !== undefined) {
    const qResult = normalizeQuestions(body.questions);
    if (qResult.error) return qResult;
    questions = qResult.questions;
  } else if (!partial) {
    return { error: 'Add at least one question' };
  }

  const payload = {};
  if (title !== undefined) payload.title = title;
  if (description !== undefined) payload.description = description;
  if (status !== undefined) payload.status = status;
  if (tags !== undefined) payload.tags = tags;
  if (questions !== undefined) payload.questions = questions;

  return { payload };
};

const publicSurveyView = (survey, company) => ({
  title: survey.title,
  description: survey.description,
  status: survey.status,
  companySlug: company?.slug || null,
  companyName: company?.name || null,
  questions: survey.questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    required: q.required,
    options: q.options ? q.options.map(capitalizeFirst) : undefined,
    maxRating: q.maxRating || undefined,
  })),
});

const validateAnswers = (survey, answers) => {
  if (!Array.isArray(answers)) {
    return { error: 'Answers are required' };
  }

  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const normalized = [];

  for (const q of survey.questions) {
    const raw = byId.get(q.id);
    const hasValue =
      raw &&
      raw.value !== undefined &&
      raw.value !== null &&
      !(typeof raw.value === 'string' && !String(raw.value).trim()) &&
      !(Array.isArray(raw.value) && raw.value.length === 0);

    if (!hasValue) {
      if (q.required) {
        return { error: `Please answer: ${q.label}` };
      }
      continue;
    }

    let value = raw.value;

    if (q.type === 'short_text' || q.type === 'long_text') {
      value = String(value).trim();
      if (!value && q.required) {
        return { error: `Please answer: ${q.label}` };
      }
    } else if (q.type === 'single_choice' || q.type === 'yes_no') {
      value = capitalizeFirst(String(value).trim());
      const opts = (q.options || []).map(capitalizeFirst);
      if (!opts.includes(value)) {
        return { error: `Invalid option for: ${q.label}` };
      }
    } else if (q.type === 'multiple_choice') {
      if (!Array.isArray(value)) {
        return { error: `Invalid answer for: ${q.label}` };
      }
      value = value
        .map((v) => capitalizeFirst(String(v).trim()))
        .filter(Boolean);
      const opts = new Set((q.options || []).map(capitalizeFirst));
      if (value.some((v) => !opts.has(v))) {
        return { error: `Invalid option for: ${q.label}` };
      }
      if (!value.length && q.required) {
        return { error: `Please answer: ${q.label}` };
      }
    } else if (q.type === 'rating') {
      const num = Number(value);
      const max = q.maxRating || 5;
      if (!Number.isInteger(num) || num < 1 || num > max) {
        return { error: `Rating for "${q.label}" must be 1–${max}` };
      }
      value = num;
    }

    normalized.push({ questionId: q.id, value });
  }

  return { answers: normalized };
};

const buildAnalysis = (survey, responses) => {
  const total = responses.length;
  const questions = survey.questions.map((q) => {
    const base = {
      questionId: q.id,
      label: q.label,
      type: q.type,
      answered: 0,
      skipped: 0,
    };

    if (
      q.type === 'single_choice' ||
      q.type === 'yes_no' ||
      q.type === 'multiple_choice'
    ) {
      const options = (q.options || []).map(capitalizeFirst);
      const counts = Object.fromEntries(options.map((o) => [o, 0]));
      for (const res of responses) {
        const ans = (res.answers || []).find((a) => a.questionId === q.id);
        if (!ans) {
          base.skipped += 1;
          continue;
        }
        base.answered += 1;
        if (q.type === 'multiple_choice' && Array.isArray(ans.value)) {
          ans.value.forEach((v) => {
            const key = capitalizeFirst(v);
            if (counts[key] != null) counts[key] += 1;
          });
        } else {
          const key = capitalizeFirst(ans.value);
          if (counts[key] != null) counts[key] += 1;
        }
      }
      const distribution = options.map((option) => ({
        option,
        count: counts[option] || 0,
        pct: base.answered
          ? Math.round(((counts[option] || 0) / base.answered) * 1000) / 10
          : 0,
      }));
      return { ...base, distribution };
    }

    if (q.type === 'rating') {
      const max = q.maxRating || 5;
      const counts = {};
      for (let i = 1; i <= max; i += 1) counts[i] = 0;
      let sum = 0;
      for (const res of responses) {
        const ans = (res.answers || []).find((a) => a.questionId === q.id);
        if (ans == null || ans.value == null) {
          base.skipped += 1;
          continue;
        }
        const n = Number(ans.value);
        if (!Number.isFinite(n)) {
          base.skipped += 1;
          continue;
        }
        base.answered += 1;
        sum += n;
        if (counts[n] != null) counts[n] += 1;
      }
      return {
        ...base,
        average:
          base.answered > 0
            ? Math.round((sum / base.answered) * 100) / 100
            : null,
        maxRating: max,
        distribution: Object.keys(counts).map((k) => ({
          option: String(k),
          count: counts[k],
          pct: base.answered
            ? Math.round((counts[k] / base.answered) * 1000) / 10
            : 0,
        })),
      };
    }

    // text answers — sample recent values
    const samples = [];
    for (const res of responses) {
      const ans = (res.answers || []).find((a) => a.questionId === q.id);
      if (
        !ans ||
        ans.value == null ||
        (typeof ans.value === 'string' && !String(ans.value).trim())
      ) {
        base.skipped += 1;
        continue;
      }
      base.answered += 1;
      if (samples.length < 50) {
        samples.push({
          value: String(ans.value),
          submittedAt: res.createdAt,
        });
      }
    }
    return { ...base, samples };
  });

  return {
    totalResponses: total,
    questions,
  };
};

/* ── Public routes (no auth) ── */

router.get('/public/:slug', async (req, res) => {
  try {
    const survey = await SmipaySurvey.findOne({ slug: req.params.slug }).populate(
      'company',
      'name slug'
    );
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    if (survey.status !== 'active') {
      return res.status(403).json({
        message:
          survey.status === 'closed'
            ? 'This survey is closed'
            : 'This survey is not available',
        status: survey.status,
      });
    }
    res.json(publicSurveyView(survey, survey.company));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load survey' });
  }
});

router.post('/public/:slug/respond', async (req, res) => {
  try {
    const survey = await SmipaySurvey.findOne({ slug: req.params.slug });
    if (!survey) {
      return res.status(404).json({ message: 'Survey not found' });
    }
    if (survey.status !== 'active') {
      return res.status(403).json({ message: 'This survey is not accepting responses' });
    }

    const { error, answers } = validateAnswers(survey, req.body.answers);
    if (error) return res.status(400).json({ message: error });

    const response = await SmipaySurveyResponse.create({
      survey: survey._id,
      answers,
    });

    res.status(201).json({
      message: 'Thank you for your response',
      id: response._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to submit response' });
  }
});

/* ── Admin routes ── */

router.use(protect, adminOnly);

router.get('/', async (req, res) => {
  try {
    const { company, error: companyError } = await resolveCompany(req);
    if (companyError) {
      return res.status(400).json({ message: companyError });
    }

    const filter = { company: company._id };
    if (req.query.status && ['draft', 'active', 'closed'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.tag) {
      filter.tags = String(req.query.tag).trim();
    }

    const surveys = await SmipaySurvey.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .lean();

    const ids = surveys.map((s) => s._id);
    const counts = await SmipaySurveyResponse.aggregate([
      { $match: { survey: { $in: ids } } },
      { $group: { _id: '$survey', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      counts.map((c) => [String(c._id), c.count])
    );

    const withCounts = surveys.map((s) => ({
      ...s,
      responseCount: countMap[String(s._id)] || 0,
    }));

    res.json({
      surveys: withCounts,
      summary: {
        total: withCounts.length,
        active: withCounts.filter((s) => s.status === 'active').length,
        draft: withCounts.filter((s) => s.status === 'draft').length,
        closed: withCounts.filter((s) => s.status === 'closed').length,
        responses: withCounts.reduce((sum, s) => sum + s.responseCount, 0),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load surveys' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { company, error: companyError } = await resolveCompany(req);
    if (companyError) {
      return res.status(400).json({ message: companyError });
    }

    const { error, payload } = validateSurveyBody(req.body);
    if (error) return res.status(400).json({ message: error });

    let slug = makeSlug();
    // Extremely unlikely collision — retry once
    // eslint-disable-next-line no-await-in-loop
    while (await SmipaySurvey.exists({ slug })) {
      slug = makeSlug();
    }

    const survey = await SmipaySurvey.create({
      ...payload,
      status: payload.status || 'active',
      tags: payload.tags || [],
      slug,
      company: company._id,
      createdBy: req.user._id,
    });

    res.status(201).json({ ...survey.toObject(), responseCount: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create survey' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { company, error: companyError } = await resolveCompany(req);
    if (companyError) {
      return res.status(400).json({ message: companyError });
    }

    const survey = await SmipaySurvey.findOne({
      _id: req.params.id,
      company: company._id,
    })
      .populate('createdBy', 'name email')
      .lean();

    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    const responseCount = await SmipaySurveyResponse.countDocuments({
      survey: survey._id,
    });

    res.json({ ...survey, responseCount });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load survey' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { company, error: companyError } = await resolveCompany(req);
    if (companyError) {
      return res.status(400).json({ message: companyError });
    }

    const survey = await SmipaySurvey.findOne({
      _id: req.params.id,
      company: company._id,
    });
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    const { error, payload } = validateSurveyBody(req.body, { partial: true });
    if (error) return res.status(400).json({ message: error });

    Object.assign(survey, payload);
    await survey.save();

    const responseCount = await SmipaySurveyResponse.countDocuments({
      survey: survey._id,
    });

    res.json({ ...survey.toObject(), responseCount });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update survey' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { company, error: companyError } = await resolveCompany(req);
    if (companyError) {
      return res.status(400).json({ message: companyError });
    }

    const survey = await SmipaySurvey.findOneAndDelete({
      _id: req.params.id,
      company: company._id,
    });
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    await SmipaySurveyResponse.deleteMany({ survey: survey._id });

    res.json({ message: 'Survey deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete survey' });
  }
});

router.get('/:id/responses', async (req, res) => {
  try {
    const { company, error: companyError } = await resolveCompany(req);
    if (companyError) {
      return res.status(400).json({ message: companyError });
    }

    const survey = await SmipaySurvey.findOne({
      _id: req.params.id,
      company: company._id,
    }).lean();
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    const responses = await SmipaySurveyResponse.find({ survey: survey._id })
      .sort({ createdAt: -1 })
      .lean();

    const questionMap = Object.fromEntries(
      survey.questions.map((q) => [q.id, q])
    );

    const enriched = responses.map((r) => ({
      _id: r._id,
      createdAt: r.createdAt,
      answers: (r.answers || []).map((a) => ({
        questionId: a.questionId,
        label: questionMap[a.questionId]?.label || a.questionId,
        type: questionMap[a.questionId]?.type,
        value: a.value,
      })),
    }));

    res.json({
      survey: {
        _id: survey._id,
        title: survey.title,
        questions: survey.questions,
      },
      responses: enriched,
      total: enriched.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load responses' });
  }
});

router.get('/:id/analysis', async (req, res) => {
  try {
    const { company, error: companyError } = await resolveCompany(req);
    if (companyError) {
      return res.status(400).json({ message: companyError });
    }

    const survey = await SmipaySurvey.findOne({
      _id: req.params.id,
      company: company._id,
    }).lean();
    if (!survey) return res.status(404).json({ message: 'Survey not found' });

    const responses = await SmipaySurveyResponse.find({ survey: survey._id })
      .sort({ createdAt: -1 })
      .lean();

    const analysis = buildAnalysis(survey, responses);

    res.json({
      survey: {
        _id: survey._id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        tags: survey.tags,
      },
      analysis,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load analysis' });
  }
});

module.exports = router;
