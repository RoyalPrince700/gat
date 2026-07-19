const express = require('express');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

const ROLES = ['admin', 'user'];

const formatUser = async (id) =>
  User.findById(id).select('-password').populate('company', 'name slug type');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate('company', 'name slug type')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role = 'user', company } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters' });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (role === 'user' && !company) {
      return res
        .status(400)
        .json({ message: 'Team members must be assigned to a company' });
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      status: 'active',
      company: role === 'admin' ? company || null : company,
    });

    res.status(201).json(await formatUser(user._id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { name, role, company } = req.body;
    const wasPending = (user.status || 'active') === 'pending';

    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      if (user.role === 'admin' && role !== 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res
            .status(400)
            .json({ message: 'Cannot demote the last admin' });
        }
      }

      user.role = role;
    }

    if (name !== undefined) user.name = name;
    if (company !== undefined) user.company = company || null;

    const nextRole = role !== undefined ? role : user.role;
    if (nextRole === 'user' && !user.company) {
      // Pending signups may sit unassigned until an admin picks a company.
      if (!wasPending) {
        return res
          .status(400)
          .json({ message: 'Team members must be assigned to a company' });
      }
    }

    // Activating a pending user: admin role, or team member with a company.
    if (wasPending) {
      if (nextRole === 'admin' || (nextRole === 'user' && user.company)) {
        user.status = 'active';
      }
    }

    await user.save();
    res.json(await formatUser(user._id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
