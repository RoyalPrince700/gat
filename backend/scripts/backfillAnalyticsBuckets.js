require('dotenv').config();
const mongoose = require('mongoose');
const SmipayRecord = require('../models/SmipayRecord');
const { applyAnalyticsBuckets } = require('../utils/smipayAnalyticsBuckets');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const cursor = SmipayRecord.find({
      $or: [
        { timeOfDay: null },
        { timeOfDay: { $exists: false } },
        { amountBucket: null },
        { amountBucket: { $exists: false } },
      ],
    }).cursor();

    let updated = 0;
    for await (const doc of cursor) {
      applyAnalyticsBuckets(doc);
      await doc.save();
      updated += 1;
      if (updated % 100 === 0) console.log(`Updated ${updated} records…`);
    }

    console.log(`Backfill complete. Updated ${updated} records.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
