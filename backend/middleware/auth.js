const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** Portfolio-level roles: multi-company read (admin also has write/ops). */
const isMdOrAdmin = (user) =>
  Boolean(user && (user.role === 'admin' || user.role === 'md'));

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password').populate('company');
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const isPending = (req.user.status || 'active') === 'pending';
    const url = String(req.originalUrl || '').split('?')[0];
    const isMeRoute = url === '/api/auth/me' || url.endsWith('/auth/me');
    if (isPending && !isMeRoute) {
      return res.status(403).json({
        message: 'Your account is waiting for an admin to assign your role',
        code: 'PENDING',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Admin access required' });
};

/** MD or admin — portfolio overview, analytics read, multi-company data. */
const mdOrAdmin = (req, res, next) => {
  if (isMdOrAdmin(req.user)) {
    return next();
  }
  return res.status(403).json({ message: 'MD or admin access required' });
};

/** MD only — performance interviews and scorecards. */
const mdOnly = (req, res, next) => {
  if (req.user && req.user.role === 'md') {
    return next();
  }
  return res.status(403).json({ message: 'MD access required' });
};

module.exports = { protect, adminOnly, mdOrAdmin, mdOnly, isMdOrAdmin };
