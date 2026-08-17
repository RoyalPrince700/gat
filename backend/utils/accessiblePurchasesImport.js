const crypto = require('crypto');
const XLSX = require('xlsx');
const AccessibleSchoolPurchase = require('../models/AccessibleSchoolPurchase');
const {
  cleanSchoolName,
  parseAmount,
  looksLikeHeaderRow,
  isNumericLabel,
  isJunkSchoolName,
} = require('./accessibleSchoolName');

const MAX_ROWS = 50000;
const INSERT_CHUNK = 2000;

const sheetToRows = (sheet) => {
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: true,
    blankrows: false,
  });
};

const cellUsed = (value) => {
  if (value == null || value === '') return false;
  return String(value).trim() !== '';
};

/**
 * Score a (schoolCol, amountCol) pair by how many rows parse as school + amount.
 */
const scoreColumnPair = (rows, schoolCol, amountCol) => {
  let score = 0;
  const sample = rows.slice(0, 80);
  for (const row of sample) {
    if (!Array.isArray(row)) continue;
    const rawSchool = row[schoolCol];
    const rawAmount = row[amountCol];
    if (!cellUsed(rawSchool) && !cellUsed(rawAmount)) continue;
    if (looksLikeHeaderRow(rawSchool, rawAmount)) continue;
    if (isNumericLabel(rawSchool)) continue;
    const school = cleanSchoolName(rawSchool);
    const amount = parseAmount(rawAmount);
    if (school && !amount.error) score += 1;
  }
  return score;
};

const detectColumns = (rows) => {
  const bc = scoreColumnPair(rows, 1, 2);
  const ab = scoreColumnPair(rows, 0, 1);
  if (ab > bc) return { schoolCol: 0, amountCol: 1 };
  return { schoolCol: 1, amountCol: 2 };
};

const countCandidateRows = (rows) => {
  const { schoolCol, amountCol } = detectColumns(rows);
  return scoreColumnPair(rows, schoolCol, amountCol);
};

/**
 * Prefer Sheet2, then the first sheet, then the densest sheet with usable data.
 */
const pickBestSheet = (workbook) => {
  const names = workbook.SheetNames || [];
  if (!names.length) return { error: 'Workbook has no sheets' };

  const loaded = names.map((name) => {
    const rows = sheetToRows(workbook.Sheets[name]);
    return { name, rows, candidates: countCandidateRows(rows) };
  });

  const sheet2 =
    loaded.find((s) => /^sheet\s*2$/i.test(String(s.name).trim())) ||
    loaded[1];
  if (sheet2 && sheet2.candidates > 0) {
    return { name: sheet2.name, rows: sheet2.rows };
  }

  const first = loaded[0];
  if (first && first.candidates > 0) {
    return { name: first.name, rows: first.rows };
  }

  loaded.sort((a, b) => b.candidates - a.candidates || b.rows.length - a.rows.length);
  const best = loaded[0];
  if (!best || !best.rows.length) {
    return { error: 'No data rows found in the workbook' };
  }
  return { name: best.name, rows: best.rows };
};

const parseRows = (rows) => {
  const { schoolCol, amountCol } = detectColumns(rows);
  const parsed = [];
  const errors = [];
  let skipped = 0;

  if (rows.length > MAX_ROWS) {
    return {
      parsed: [],
      skipped: 0,
      errors: [
        {
          row: 0,
          message: `Too many rows (max ${MAX_ROWS}). Split the file and try again.`,
        },
      ],
    };
  }

  for (let i = 0; i < rows.length; i += 1) {
    const excelRow = i + 1;
    const row = rows[i];
    if (!Array.isArray(row)) {
      skipped += 1;
      continue;
    }

    const rawSchool = row[schoolCol];
    const rawAmount = row[amountCol];

    if (!cellUsed(rawSchool) && !cellUsed(rawAmount)) {
      skipped += 1;
      continue;
    }

    if (looksLikeHeaderRow(rawSchool, rawAmount)) {
      skipped += 1;
      continue;
    }

    const schoolName = cleanSchoolName(rawSchool);
    if (!schoolName || isNumericLabel(rawSchool)) {
      skipped += 1;
      if (cellUsed(rawSchool) || cellUsed(rawAmount)) {
        errors.push({
          row: excelRow,
          message: 'No usable school name',
        });
      }
      continue;
    }

    if (isJunkSchoolName(schoolName)) {
      skipped += 1;
      errors.push({
        row: excelRow,
        message: 'Spreadsheet total/summary row skipped',
      });
      continue;
    }

    const amount = parseAmount(rawAmount);
    if (amount.error) {
      skipped += 1;
      errors.push({ row: excelRow, message: amount.error });
      continue;
    }

    parsed.push({
      schoolName,
      amount: amount.value,
      sourceRow: excelRow,
      rawLabel: String(rawSchool == null ? '' : rawSchool).trim(),
    });
  }

  return { parsed, skipped, errors };
};

const insertInChunks = async (docs) => {
  for (let i = 0; i < docs.length; i += INSERT_CHUNK) {
    const chunk = docs.slice(i, i + INSERT_CHUNK);
    await AccessibleSchoolPurchase.insertMany(chunk, { ordered: false });
  }
};

const summarizeDocs = (docs) => {
  const schoolKeys = new Set();
  let totalAmount = 0;
  for (const d of docs) {
    schoolKeys.add(String(d.schoolName || '').trim().toLowerCase());
    totalAmount += d.amount || 0;
  }
  return {
    rowCount: docs.length,
    schoolCount: schoolKeys.size,
    totalAmount,
  };
};

/**
 * Parse a season workbook and replace (default) or append that season's purchases.
 */
const importPurchasesFromBuffer = async ({
  buffer,
  companyId,
  season,
  userId,
  mode = 'replace',
}) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = pickBestSheet(workbook);
  if (sheet.error) {
    return {
      imported: 0,
      skipped: 0,
      replaced: 0,
      season,
      totalAmount: 0,
      errors: [{ row: 0, message: sheet.error }],
    };
  }

  const { parsed, skipped, errors } = parseRows(sheet.rows);
  if (!parsed.length) {
    return {
      imported: 0,
      skipped,
      replaced: 0,
      season,
      sheet: sheet.name,
      totalAmount: 0,
      errors: errors.length
        ? errors
        : [{ row: 0, message: 'No usable school / amount rows found' }],
    };
  }

  const replace = mode !== 'append';
  let replaced = 0;
  if (replace) {
    const deleted = await AccessibleSchoolPurchase.deleteMany({
      company: companyId,
      season,
    });
    replaced = deleted.deletedCount || 0;
  }

  const importBatchId = crypto.randomUUID();
  const docs = parsed.map((row) => ({
    company: companyId,
    season,
    schoolName: row.schoolName,
    amount: row.amount,
    sourceRow: row.sourceRow,
    rawLabel: row.rawLabel,
    importedBy: userId,
    importBatchId,
  }));

  await insertInChunks(docs);

  const totals = summarizeDocs(parsed);
  return {
    imported: parsed.length,
    skipped,
    replaced,
    season,
    sheet: sheet.name,
    mode: replace ? 'replace' : 'append',
    importBatchId,
    totalAmount: totals.totalAmount,
    schoolCount: totals.schoolCount,
    errors,
  };
};

module.exports = {
  importPurchasesFromBuffer,
  pickBestSheet,
  parseRows,
  MAX_ROWS,
};
