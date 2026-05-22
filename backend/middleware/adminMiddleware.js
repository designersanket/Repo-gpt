const ensureAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      code: 'ADMIN_ONLY',
      message: 'Admin access required.',
    });
  }
  next();
};

module.exports = { ensureAdmin };
