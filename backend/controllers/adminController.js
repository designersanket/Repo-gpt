const User = require('../models/User');
const Usage = require('../models/Usage');
const { success, failure } = require('../utils/apiResponse');
const { getAdminSummary } = require('../services/usageService');

exports.getAdminSummary = async (req, res) => {
  try {
    const summary = await getAdminSummary();
    const activeUsers = await User.countDocuments();
    return success(res, { summary, activeUsers });
  } catch (error) {
    return failure(res, 500, 'ADMIN_SUMMARY_FAILED', 'Unable to fetch admin analytics');
  }
};

exports.getTopUsers = async (req, res) => {
  try {
    const activeUsers = await Usage.find().sort('-aiRequests').limit(10).populate('userId', 'username email');
    const payload = activeUsers.map((item) => ({
      userId: item.userId._id,
      username: item.userId.username,
      email: item.userId.email,
      aiRequests: item.aiRequests,
      tokensUsed: item.tokensUsed,
      estimatedCost: item.estimatedCost,
      quotaViolations: item.quotaViolations,
    }));
    return success(res, payload);
  } catch (error) {
    return failure(res, 500, 'ADMIN_TOP_USERS_FAILED', 'Unable to fetch top users');
  }
};

exports.getViolationStats = async (req, res) => {
  try {
    const violations = await Usage.aggregate([
      { $match: { quotaViolations: { $gt: 0 } } },
      { $group: { _id: null, totalViolations: { $sum: '$quotaViolations' }, users: { $push: '$userId' } } },
    ]);
    return success(res, violations[0] || { totalViolations: 0, users: [] });
  } catch (error) {
    return failure(res, 500, 'ADMIN_VIOLATIONS_FAILED', 'Unable to fetch quota violations');
  }
};
