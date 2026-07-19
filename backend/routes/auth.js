const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.get('/setup-status', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ needsAdmin: count === 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status || 'active',
  company: user.company,
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // First account becomes active admin. Later signups wait for admin role/company assignment.
    const user = await User.create({
      name,
      email,
      password,
      role: isFirstUser ? 'admin' : 'user',
      status: isFirstUser ? 'active' : 'pending',
      company: null,
    });

    const populated = await User.findById(user._id).populate('company');

    res.status(201).json({
      user: formatUser(populated),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('company');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      user: formatUser(user),
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: formatUser(req.user) });
});

module.exports = router;
