const express = require('express');
const Company = require('../models/Company');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

router.get('/public', async (req, res) => {
  try {
    const companies = await Company.find()
      .select('name slug type description')
      .sort({ name: 1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const companies = await Company.find().sort({ name: 1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, type, description, slug } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const finalSlug = slug || slugify(name);
    const exists = await Company.findOne({ slug: finalSlug });
    if (exists) {
      return res.status(400).json({ message: 'Company slug already exists' });
    }

    const company = await Company.create({
      name,
      slug: finalSlug,
      type: type || 'other',
      description: description || '',
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const { name, type, description, slug } = req.body;
    if (name !== undefined) company.name = name;
    if (type !== undefined) company.type = type;
    if (description !== undefined) company.description = description;
    if (slug !== undefined) company.slug = slugify(slug);

    await company.save();
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json({ message: 'Company deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:slug', protect, async (req, res) => {
  try {
    const company = await Company.findOne({ slug: req.params.slug });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
