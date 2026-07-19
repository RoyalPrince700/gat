const Company = require('../models/Company');

const DEFAULT_COMPANIES = [
  {
    name: 'Smipay',
    slug: 'smipay',
    type: 'fintech',
    description: 'Fintech payments and transaction growth tracking',
  },
  {
    name: 'Smart Edu Hub',
    slug: 'smart-edu-hub',
    type: 'education',
    description: 'School management system growth tracking',
  },
];

const ensureCompanies = async () => {
  for (const company of DEFAULT_COMPANIES) {
    await Company.findOneAndUpdate(
      { slug: company.slug },
      { $setOnInsert: company },
      { upsert: true, new: true }
    );
  }
};

module.exports = ensureCompanies;
