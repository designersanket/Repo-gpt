const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'codemind-super-secret-key-123';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Fallback for easy local development (Guest Mode)
  if (!token) {
    req.user = {
      _id: '000000000000000000000000', // Mock ObjectId
      username: 'guest',
      email: 'guest@codemind.local',
    };
    return next();
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      // Fallback if user was deleted
      req.user = {
        _id: '000000000000000000000000',
        username: 'guest',
        email: 'guest@codemind.local',
      };
      return next();
    }
    
    req.user = user;
    next();
  } catch (error) {
    // Return unauthorized or fallback to guest for development
    req.user = {
      _id: '000000000000000000000000',
      username: 'guest',
      email: 'guest@codemind.local',
    };
    next();
  }
};

module.exports = { protect };
