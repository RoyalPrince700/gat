const express = require('express');
const SmipayRecord = require('../models/SmipayRecord');
const SmehSubscription = require('../models/SmehSubscription');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

const escapeCsv = (value) => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const toCsv = (headers, rows) => {
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(row.map(escapeCsv).join(','));
  });
  return lines.join('\n');
};

const dateFilter = (from, to) => {
  if (!from && !to) return {};
  const date = {};
  if (from) date.$gte = new Date(from);
  if (to) date.$lte = new Date(to);
  return { date };
};

const yesNo = (v) => (v ? 'Yes' : 'No');

router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const filter = dateFilter(req.query.from, req.query.to);
    const [smipay, smeh] = await Promise.all([
      SmipayRecord.find(filter).sort({ date: -1 }),
      SmehSubscription.find(filter).sort({ date: -1 }),
    ]);

    const rows = [
      ...smipay.map((r) => [
        'Smipay',
        r.customerName,
        r.transactionCount,
        r.totalAmount,
        r.date.toISOString().slice(0, 10),
        r.channel,
        r.notes,
      ]),
      ...smeh.map((r) => [
        'Smart Edu Hub',
        r.schoolName,
        r.subscriptionStatus,
        r.amount,
        r.date.toISOString().slice(0, 10),
        `ends:${r.endsAt ? r.endsAt.toISOString().slice(0, 10) : ''}`,
        r.notes,
      ]),
    ];

    const csv = toCsv(
      ['Company', 'Name', 'Count/Status', 'Amount', 'Date', 'Meta', 'Notes'],
      rows
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="all-companies-growth-report.csv"'
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/smipay', protect, adminOnly, async (req, res) => {
  try {
    const filter = dateFilter(req.query.from, req.query.to);
    const records = await SmipayRecord.find(filter).sort({ date: -1 });

    const csv = toCsv(
      [
        'Customer Name',
        'Category',
        'Transaction Count',
        'Total Amount',
        'Average Amount',
        'Date',
        'Channel',
        'Notes',
      ],
      records.map((r) => [
        r.customerName,
        r.category,
        r.transactionCount,
        r.totalAmount,
        r.averageAmount,
        r.date.toISOString().slice(0, 10),
        r.channel,
        r.notes,
      ])
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="smipay-growth-report.csv"'
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/smart-edu-hub', protect, adminOnly, async (req, res) => {
  try {
    const filter = dateFilter(req.query.from, req.query.to);
    const records = await SmehSubscription.find(filter).sort({ date: -1 });

    const csv = toCsv(
      [
        'School Name',
        'Subscription Status',
        'Amount',
        'Started At',
        'Ends At',
        'Student Onboarded',
        'Teacher Onboarded',
        'Parent Onboarded',
        'Platform In Use',
        'Logged Date',
        'Notes',
      ],
      records.map((r) => [
        r.schoolName,
        r.subscriptionStatus,
        r.amount,
        r.startedAt ? r.startedAt.toISOString().slice(0, 10) : '',
        r.endsAt ? r.endsAt.toISOString().slice(0, 10) : '',
        yesNo(r.studentOnboarded),
        yesNo(r.teacherOnboarded),
        yesNo(r.parentOnboarded),
        yesNo(r.platformInUse),
        r.date.toISOString().slice(0, 10),
        r.notes,
      ])
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="smart-edu-hub-growth-report.csv"'
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
