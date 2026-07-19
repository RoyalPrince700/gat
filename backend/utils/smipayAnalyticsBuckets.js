const TIME_OF_DAY_VALUES = ['morning', 'afternoon', 'evening', 'night'];
const AMOUNT_BUCKET_VALUES = [
  'under_100',
  '100_500',
  '500_1000',
  '1000_2000',
  '2000_plus',
];

const TIME_OF_DAY_LABELS = {
  morning: 'Morning (5am–11am)',
  afternoon: 'Afternoon (12pm–4pm)',
  evening: 'Evening (5pm–8pm)',
  night: 'Night (9pm–4am)',
};

const AMOUNT_BUCKET_LABELS = {
  under_100: 'Under ₦100',
  '100_500': '₦100–500',
  '500_1000': '₦500–1,000',
  '1000_2000': '₦1,000–2,000',
  '2000_plus': '₦2,000+',
};

/** Hour in Africa/Lagos (UTC+1, no DST). */
const lagosHour = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  // Lagos is UTC+1 year-round
  return (d.getUTCHours() + 1) % 24;
};

const resolveTimeOfDay = (date) => {
  const hour = lagosHour(date);
  if (hour == null) return null;
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 20) return 'evening';
  return 'night';
};

const ticketAmount = (totalAmount, transactionCount, averageAmount) => {
  const count = Number(transactionCount) || 0;
  if (count === 1) return Number(totalAmount) || 0;
  if (averageAmount != null && averageAmount > 0) return Number(averageAmount);
  if (count > 0) return (Number(totalAmount) || 0) / count;
  return Number(totalAmount) || 0;
};

const resolveAmountBucket = (totalAmount, transactionCount, averageAmount) => {
  const amount = ticketAmount(totalAmount, transactionCount, averageAmount);
  if (amount < 100) return 'under_100';
  if (amount < 500) return '100_500';
  if (amount < 1000) return '500_1000';
  if (amount < 2000) return '1000_2000';
  return '2000_plus';
};

const applyAnalyticsBuckets = (doc) => {
  if (doc.transactionCount > 0) {
    doc.averageAmount = doc.totalAmount / doc.transactionCount;
  }
  doc.timeOfDay = resolveTimeOfDay(doc.date);
  doc.amountBucket = resolveAmountBucket(
    doc.totalAmount,
    doc.transactionCount,
    doc.averageAmount
  );
  return doc;
};

module.exports = {
  TIME_OF_DAY_VALUES,
  AMOUNT_BUCKET_VALUES,
  TIME_OF_DAY_LABELS,
  AMOUNT_BUCKET_LABELS,
  lagosHour,
  resolveTimeOfDay,
  resolveAmountBucket,
  ticketAmount,
  applyAnalyticsBuckets,
};
