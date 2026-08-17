const OxygenAdvertiser = require('../models/OxygenAdvertiser');
const OxygenBooking = require('../models/OxygenBooking');
const { BOOKING_TYPES } = require('./oxygenMeta');

/**
 * Lightweight Oxygen FM overview aggregates (Phase 1).
 */
const buildOxygenGrowth = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const [advertiserCount, newAdvertisers30d, bookings, recentBookings] =
    await Promise.all([
      OxygenAdvertiser.countDocuments(),
      OxygenAdvertiser.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
      OxygenBooking.find()
        .select(
          'status bookingType contractValue amountReceived title advertiserName date'
        )
        .lean(),
      OxygenBooking.find()
        .sort({ date: -1 })
        .limit(8)
        .select('title advertiserName bookingType status contractValue date')
        .lean(),
    ]);

  let runningOrBooked = 0;
  let completedBookings = 0;
  let pipelineValue = 0;
  let amountReceived = 0;
  const bookingTypeMap = {};

  BOOKING_TYPES.forEach((type) => {
    bookingTypeMap[type.value] = {
      bookingType: type.value,
      label: type.label,
      count: 0,
      contractValue: 0,
    };
  });

  bookings.forEach((b) => {
    if (b.status === 'booked' || b.status === 'running') runningOrBooked += 1;
    if (b.status === 'completed') completedBookings += 1;
    pipelineValue += b.contractValue || 0;
    amountReceived += b.amountReceived || 0;

    const key = b.bookingType || 'other';
    if (!bookingTypeMap[key]) {
      bookingTypeMap[key] = {
        bookingType: key,
        label: key,
        count: 0,
        contractValue: 0,
      };
    }
    bookingTypeMap[key].count += 1;
    bookingTypeMap[key].contractValue += b.contractValue || 0;
  });

  const byBookingType = Object.values(bookingTypeMap).filter(
    (row) => row.count > 0 || row.contractValue > 0
  );

  return {
    advertiserCount,
    newAdvertisers30d,
    bookingCount: bookings.length,
    runningOrBooked,
    completedBookings,
    pipelineValue,
    amountReceived,
    byBookingType,
    recentActivity: recentBookings,
  };
};

module.exports = { buildOxygenGrowth };
