const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { failure } = require('../utils/apiResponse');

const JWT_SECRET = process.env.JWT_SECRET || 'codemind-super-secret-key-123';

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return failure(res, 401, 'NOT_AUTHORIZED', 'Not authorized. Please log in.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return failure(res, 401, 'USER_NOT_FOUND', 'User no longer exists.');
    }
    req.user = user;
    next();
  } catch (err) {
    return failure(res, 401, 'INVALID_TOKEN', 'Invalid or expired token.');
  }
};

module.exports = { protect };
