const express = require('express');
const mongoose = require('mongoose');
const PerformanceAssessment = require('../models/PerformanceAssessment');
const Staff = require('../models/Staff');
const { protect, mdOrAdmin } = require('../middleware/auth');
const {
  MAX_RATING,
  MIN_RATING,
  PRESET_METRICS,
  STARTER_QUESTIONS,
  PERFORMANCE_BANDS,
  bandForPercent,
  normalizeRating,
  computeScores,
} = require('../utils/performanceMeta');
const {
  buildPortfolioReportDocx,
  buildIndividualReportDocx,
  safeFilenamePart,
  formatIsoDate,
} = require('../utils/scorecardReport');

const router = express.Router();

const buildScorecards = async (query = {}) => {
  const { company, department, search, from, to } = query;
  const staffFilter = { status: { $in: ['active', 'inactive'] } };
  if (company && mongoose.Types.ObjectId.isValid(company)) {
    staffFilter.company = company;
  }
  if (department) {
    staffFilter.department = new RegExp(
      `^${String(department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      'i'
    );
  }
  if (search && String(search).trim()) {
    const q = String(search).trim();
    staffFilter.$or = [
      { name: new RegExp(q, 'i') },
      { department: new RegExp(q, 'i') },
      { jobTitle: new RegExp(q, 'i') },
    ];
  }

  const staffList = await Staff.find(staffFilter)
    .populate('company', 'name slug type')
    .sort({ name: 1 });

  const assessmentFilter = { status: 'completed' };
  if (from || to) {
    assessmentFilter.meetingDate = {};
    if (from) assessmentFilter.meetingDate.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      assessmentFilter.meetingDate.$lte = end;
    }
  }
  if (company && mongoose.Types.ObjectId.isValid(company)) {
    assessmentFilter.company = company;
  }
  if (department) {
    assessmentFilter.department = staffFilter.department;
  }

  const assessments = await PerformanceAssessment.find(assessmentFilter)
    .select(
      'staff meetingDate totalScore maxPossibleScore scorePercent status questions overallNotes conductedBy company department'
    )
    .populate('conductedBy', 'name email role')
    .sort({ meetingDate: -1 });

  const byStaff = new Map();
  for (const a of assessments) {
    const key = String(a.staff);
    if (!byStaff.has(key)) byStaff.set(key, []);
    byStaff.get(key).push(a);
  }

  const cards = staffList.map((s) => {
    const history = byStaff.get(String(s._id)) || [];
    const assessmentCount = history.length;
    const avgPercent =
      assessmentCount > 0
        ? Math.round(
            (history.reduce((sum, a) => sum + (a.scorePercent || 0), 0) /
              assessmentCount) *
              10
          ) / 10
        : null;
    const avgTotalScore =
      assessmentCount > 0
        ? Math.round(
            (history.reduce((sum, a) => sum + (a.totalScore || 0), 0) /
              assessmentCount) *
              10
          ) / 10
        : null;
    const latest = history[0] || null;
    return {
      staff: s,
      assessmentCount,
      averagePercent: avgPercent,
      averageTotalScore: avgTotalScore,
      latestAssessmentDate: latest?.meetingDate || null,
      latestScorePercent: latest?.scorePercent ?? null,
      latestTotalScore: latest?.totalScore ?? null,
      band: avgPercent != null ? bandForPercent(avgPercent) : null,
    };
  });

  cards.sort((a, b) => {
    if (a.averagePercent == null && b.averagePercent == null) {
      return a.staff.name.localeCompare(b.staff.name);
    }
    if (a.averagePercent == null) return 1;
    if (b.averagePercent == null) return -1;
    if (b.averagePercent !== a.averagePercent) {
      return b.averagePercent - a.averagePercent;
    }
    return a.staff.name.localeCompare(b.staff.name);
  });

  let rankCounter = 0;
  for (const card of cards) {
    if (card.averagePercent != null) {
      rankCounter += 1;
      card.rank = rankCounter;
    } else {
      card.rank = null;
    }
  }

  return { cards, byStaff };
};

const buildIndividualScorecard = async (staffId) => {
  const staffMember = await Staff.findById(staffId).populate(
    'company',
    'name slug type'
  );
  if (!staffMember) return null;

  const assessments = await populateAssessment(
    PerformanceAssessment.find({ staff: staffMember._id }).sort({
      meetingDate: -1,
      createdAt: -1,
    })
  );

  const completed = assessments.filter((a) => a.status === 'completed');
  const assessmentCount = completed.length;
  const averagePercent =
    assessmentCount > 0
      ? Math.round(
          (completed.reduce((sum, a) => sum + (a.scorePercent || 0), 0) /
            assessmentCount) *
            10
        ) / 10
      : null;
  const averageTotalScore =
    assessmentCount > 0
      ? Math.round(
          (completed.reduce((sum, a) => sum + (a.totalScore || 0), 0) /
            assessmentCount) *
            10
        ) / 10
      : null;

  return {
    staff: staffMember,
    assessmentCount,
    draftCount: assessments.filter((a) => a.status === 'draft').length,
    averagePercent,
    averageTotalScore,
    latestAssessmentDate: completed[0]?.meetingDate || null,
    band: averagePercent != null ? bandForPercent(averagePercent) : null,
    bands: PERFORMANCE_BANDS,
    maxRating: MAX_RATING,
    assessments,
  };
};

const resolveExportCompanyName = async (companyId) => {
  if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) return null;
  const Company = require('../models/Company');
  const company = await Company.findById(companyId).select('name');
  return company?.name || null;
};

const populateAssessment = (query) =>
  query
    .populate({
      path: 'staff',
      select: 'name department jobTitle status email phone company',
      populate: { path: 'company', select: 'name slug type' },
    })
    .populate('company', 'name slug type')
    .populate('conductedBy', 'name email role');

const sanitizeQuestions = (rawQuestions) => {
  if (!Array.isArray(rawQuestions)) {
    return { error: 'Questions must be an array' };
  }

  const questions = [];
  for (let i = 0; i < rawQuestions.length; i += 1) {
    const q = rawQuestions[i] || {};
    const rating = normalizeRating(q.rating);
    if (rating == null) {
      return {
        error: `Question ${i + 1}: rating must be a number from ${MIN_RATING} to ${MAX_RATING}`,
      };
    }
    questions.push({
      prompt: String(q.prompt || '').trim(),
      answer: String(q.answer || '').trim(),
      metric: String(q.metric || q.criterion || '').trim(),
      rating,
    });
  }
  return { questions };
};

const applyFilters = (filter, query) => {
  const { staff, department, company, status, from, to } = query;
  if (staff && mongoose.Types.ObjectId.isValid(staff)) {
    filter.staff = staff;
  }
  if (department) {
    filter.department = new RegExp(
      `^${String(department).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      'i'
    );
  }
  if (company && mongoose.Types.ObjectId.isValid(company)) {
    filter.company = company;
  }
  if (status && (status === 'draft' || status === 'completed')) {
    filter.status = status;
  }
  if (from || to) {
    filter.meetingDate = {};
    if (from) filter.meetingDate.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.meetingDate.$lte = end;
    }
  }
  return filter;
};

/** Presets & scale for the assessment form UI. */
router.get('/meta', protect, mdOrAdmin, (req, res) => {
  res.json({
    maxRating: MAX_RATING,
    minRating: MIN_RATING,
    presetMetrics: PRESET_METRICS,
    starterQuestions: STARTER_QUESTIONS,
    bands: PERFORMANCE_BANDS,
  });
});

router.get('/assessments', protect, mdOrAdmin, async (req, res) => {
  try {
    const filter = applyFilters({}, req.query);
    const assessments = await populateAssessment(
      PerformanceAssessment.find(filter).sort({ meetingDate: -1, createdAt: -1 })
    );
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/assessments/:id', protect, mdOrAdmin, async (req, res) => {
  try {
    const assessment = await populateAssessment(
      PerformanceAssessment.findById(req.params.id)
    );
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    res.json(assessment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/assessments', protect, mdOrAdmin, async (req, res) => {
  try {
    const {
      staff: staffId,
      meetingDate,
      questions: rawQuestions,
      overallNotes,
      status = 'draft',
    } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: 'Staff is required' });
    }
    if (status !== 'draft' && status !== 'completed') {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const staffMember = await Staff.findById(staffId);
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const { questions, error } = sanitizeQuestions(rawQuestions || []);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const scores = computeScores(questions);
    const assessment = await PerformanceAssessment.create({
      staff: staffMember._id,
      conductedBy: req.user._id,
      meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
      company: staffMember.company || null,
      department: staffMember.department || '',
      questions,
      overallNotes: overallNotes ? String(overallNotes).trim() : '',
      status,
      ...scores,
    });

    res
      .status(201)
      .json(
        await populateAssessment(PerformanceAssessment.findById(assessment._id))
      );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/assessments/:id', protect, mdOrAdmin, async (req, res) => {
  try {
    const assessment = await PerformanceAssessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const {
      staff: staffId,
      meetingDate,
      questions: rawQuestions,
      overallNotes,
      status,
    } = req.body;

    if (staffId !== undefined) {
      const staffMember = await Staff.findById(staffId);
      if (!staffMember) {
        return res.status(404).json({ message: 'Staff member not found' });
      }
      assessment.staff = staffMember._id;
      assessment.company = staffMember.company || null;
      assessment.department = staffMember.department || '';
    }

    if (meetingDate !== undefined) {
      assessment.meetingDate = meetingDate
        ? new Date(meetingDate)
        : assessment.meetingDate;
    }

    if (rawQuestions !== undefined) {
      const { questions, error } = sanitizeQuestions(rawQuestions);
      if (error) {
        return res.status(400).json({ message: error });
      }
      assessment.questions = questions;
      const scores = computeScores(questions);
      assessment.totalScore = scores.totalScore;
      assessment.maxPossibleScore = scores.maxPossibleScore;
      assessment.scorePercent = scores.scorePercent;
    }

    if (overallNotes !== undefined) {
      assessment.overallNotes = String(overallNotes || '').trim();
    }

    if (status !== undefined) {
      if (status !== 'draft' && status !== 'completed') {
        return res.status(400).json({ message: 'Invalid status' });
      }
      assessment.status = status;
    }

    await assessment.save();
    res.json(
      await populateAssessment(PerformanceAssessment.findById(assessment._id))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/assessments/:id', protect, mdOrAdmin, async (req, res) => {
  try {
    const assessment = await PerformanceAssessment.findByIdAndDelete(
      req.params.id
    );
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }
    res.json({ message: 'Assessment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Overall portfolio staff performance (ranked by average %). */
router.get('/scorecards', protect, mdOrAdmin, async (req, res) => {
  try {
    const { cards } = await buildScorecards(req.query);
    res.json({
      rankedBy: 'averagePercent',
      bands: PERFORMANCE_BANDS,
      maxRating: MAX_RATING,
      scorecards: cards,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Download portfolio report (Word .docx).
 * Same query filters as GET /scorecards.
 */
router.get('/scorecards/export', protect, mdOrAdmin, async (req, res) => {
  try {
    const { cards, byStaff } = await buildScorecards(req.query);
    const companyName = await resolveExportCompanyName(req.query.company);

    const detailsByStaffId = new Map();
    for (const card of cards) {
      const id = String(card.staff._id);
      detailsByStaffId.set(id, {
        assessments: byStaff.get(id) || [],
      });
    }

    const buffer = await buildPortfolioReportDocx({
      scorecards: cards,
      detailsByStaffId,
      generatedBy: {
        name: req.user?.name,
        role: req.user?.role,
      },
      filters: {
        search: req.query.search,
        department: req.query.department,
        company: req.query.company,
        companyName,
        from: req.query.from,
        to: req.query.to,
      },
    });

    const filename = `staff-scorecards-${formatIsoDate(new Date())}.docx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/** Download individual scorecard report (Word .docx). */
router.get(
  '/scorecards/:staffId/export',
  protect,
  mdOrAdmin,
  async (req, res) => {
    try {
      const data = await buildIndividualScorecard(req.params.staffId);
      if (!data) {
        return res.status(404).json({ message: 'Staff member not found' });
      }

      const buffer = await buildIndividualReportDocx({
        staff: data.staff,
        card: {
          staff: data.staff,
          assessmentCount: data.assessmentCount,
          averagePercent: data.averagePercent,
          averageTotalScore: data.averageTotalScore,
          latestAssessmentDate: data.latestAssessmentDate,
          band: data.band,
          rank: null,
        },
        assessments: data.assessments,
        generatedBy: {
          name: req.user?.name,
          role: req.user?.role,
        },
        filters: {},
      });

      const filename = `scorecard-${safeFilenamePart(data.staff.name)}-${formatIsoDate(
        new Date()
      )}.docx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

/** Individual scorecard + full assessment history. */
router.get('/scorecards/:staffId', protect, mdOrAdmin, async (req, res) => {
  try {
    const data = await buildIndividualScorecard(req.params.staffId);
    if (!data) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
