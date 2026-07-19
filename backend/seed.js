require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
const SmipayRecord = require('./models/SmipayRecord');
const SmipayCustomer = require('./models/SmipayCustomer');
const SmehSchool = require('./models/SmehSchool');
const SmehSubscription = require('./models/SmehSubscription');
const EduRecord = require('./models/EduRecord');
const ensureCompanies = require('./utils/ensureCompanies');

/**
 * Clears demo/content data and ensures company shells exist.
 * Does NOT create users, customers, or transactions.
 */
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await Promise.all([
      User.deleteMany(),
      SmipayRecord.deleteMany(),
      SmipayCustomer.deleteMany(),
      SmehSchool.deleteMany(),
      SmehSubscription.deleteMany(),
      EduRecord.deleteMany(),
    ]);

    await ensureCompanies();

    const companies = await Company.find().sort({ name: 1 });
    console.log('Cleared users, customers, and transactions.');
    console.log(
      'Companies ready:',
      companies.map((c) => c.name).join(', ')
    );
    console.log('No demo accounts or sample data were created.');
    console.log('Sign up from the app to create your own users.');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seed();
