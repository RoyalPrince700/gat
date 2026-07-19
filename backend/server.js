require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const ensureCompanies = require('./utils/ensureCompanies');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const userRoutes = require('./routes/users');
const overviewRoutes = require('./routes/overview');
const smipayRoutes = require('./routes/smipay');
const smipayCustomerRoutes = require('./routes/smipayCustomers');
const smipayTransactionRoutes = require('./routes/smipayTransactions');
const socialMediaRoutes = require('./routes/socialMedia');
const smipayKpiRoutes = require('./routes/smipayKpi');
const smipayCostRoutes = require('./routes/smipayCosts');
const smipaySurveyRoutes = require('./routes/smipaySurveys');
const smehRoutes = require('./routes/smeh');
const smehSchoolRoutes = require('./routes/smehSchools');
const analyticsRoutes = require('./routes/analytics');
const reportRoutes = require('./routes/reports');

const start = async () => {
  await connectDB();
  await ensureCompanies();
  console.log('Companies ready (Smipay, Smart Edu Hub)');

  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(morgan('dev'));

  app.get('/', (req, res) => {
    res.json({ message: 'GAT API — Growth Analysis Tool' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/overview', overviewRoutes);
  app.use('/api/smipay/customers', smipayCustomerRoutes);
  app.use('/api/smipay/transactions', smipayTransactionRoutes);
  app.use('/api/smipay/kpi', smipayKpiRoutes);
  app.use('/api/smipay/costs', smipayCostRoutes);
  app.use('/api/smipay/surveys', smipaySurveyRoutes);
  app.use('/api/smipay', smipayRoutes);
  app.use('/api/social-media', socialMediaRoutes);
  app.use('/api/smeh/schools', smehSchoolRoutes);
  app.use('/api/smeh', smehRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/reports', reportRoutes);

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      message: err.message || 'Server error',
    });
  });

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`GAT API running on port ${PORT}`);
  });
};

start();
