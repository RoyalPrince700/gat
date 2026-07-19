const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = { protect, adminOnly };
