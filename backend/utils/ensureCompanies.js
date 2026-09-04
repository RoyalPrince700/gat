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
  {
    name: 'Best Technologies IT',
    slug: 'best-technology-it',
    type: 'other',
    description:
      'Enterprise software solutions and digital marketing transformation strategies that drive exponential growth.',
  },
  {
    name: 'Accessible Publishers Limited',
    slug: 'accessible-publishers',
    type: 'education',
    description:
      'Award-winning book publishing firm (Ibadan). Educational materials elementary–tertiary; print, audio, e-books, animations, Braille, printing and procurement.',
  },
  {
    name: 'Oxygen FM',
    slug: 'oxygen-fm',
    type: 'other',
    description:
      'Radio station — advertisers, airtime bookings, and commercial growth tracking.',
  },
  {
    name: 'Trifone',
    slug: 'trifone',
    type: 'other',
    description:
      'Smart Technology, Everyday Comfort — tablets, power banks, and smart electronics for home, school, and work.',
  },
  {
    name: 'Best In Print',
    slug: 'best-in-print',
    type: 'other',
    description:
      'Commercial printing company — books, fliers, and related print production jobs.',
  },
  {
    name: 'Best Tech Construction',
    slug: 'best-tech-construction',
    type: 'other',
    description:
      'Construction and building projects — site works, developments, and project delivery.',
  },
];

const ensureCompanies = async () => {
  for (const company of DEFAULT_COMPANIES) {
    await Company.findOneAndUpdate(
      { slug: company.slug },
      {
        $set: { name: company.name, description: company.description },
        $setOnInsert: { slug: company.slug, type: company.type },
      },
      { upsert: true, new: true }
    );
  }
};

module.exports = ensureCompanies;
