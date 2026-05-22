const Usage = require('../models/Usage');
const { DAILY_LIMITS } = require('../config/usageConfig');

const normalizeDate = (date = new Date()) => {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

const createDefaultUsage = () => ({
  aiRequests: 0,
  embeddingRequests: 0,
  repoClones: 0,
  promptTokens: 0,
  completionTokens: 0,
  tokensUsed: 0,
  estimatedCost: 0,
  failedRequests: 0,
  quotaViolations: 0,
  lastReset: normalizeDate(),
});

const getUsageDocument = async (userId) => {
  const today = normalizeDate();
  const usage = await Usage.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: createDefaultUsage(),
      $set: { updatedAt: new Date() },
    },
    { new: true, upsert: true }
  );
  if (!usage.lastReset || usage.lastReset < today) {
    return await resetUsage(userId);
  }
  return usage;
};

const resetUsage = async (userId) => {
  const today = normalizeDate();
  const usage = await Usage.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...createDefaultUsage(),
        userId,
        lastReset: today,
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true }
  );
  return usage;
};

const scheduleDailyReset = () => {
  const oneHour = 1000 * 60 * 60;
  setInterval(async () => {
    const today = normalizeDate();
    try {
      await Usage.updateMany(
        { lastReset: { $lt: today } },
        {
          $set: {
            aiRequests: 0,
            embeddingRequests: 0,
            repoClones: 0,
            promptTokens: 0,
            completionTokens: 0,
            tokensUsed: 0,
            estimatedCost: 0,
            failedRequests: 0,
            quotaViolations: 0,
            lastReset: today,
            updatedAt: new Date(),
          },
        }
      );
    } catch (err) {
      console.error('Daily usage reset failed:', err.message);
    }
  }, oneHour);
};

const incrementUsage = async (userId, data) => {
  await resetUsageIfNeeded(userId);
  const usage = await Usage.findOneAndUpdate(
    { userId },
    {
      $inc: data,
      $set: { updatedAt: new Date() },
    },
    { new: true, upsert: true }
  );
  return usage;
};

const resetUsageIfNeeded = async (userId) => {
  const today = normalizeDate();
  const usage = await Usage.findOne({ userId });
  if (!usage || !usage.lastReset || usage.lastReset < today) {
    return resetUsage(userId);
  }
  return usage;
};

const recordTokenUsage = async (userId, promptTokens = 0, completionTokens = 0) => {
  const totalTokens = promptTokens + completionTokens;
  const estimatedCost = totalTokens * DAILY_LIMITS.costPerToken;
  return incrementUsage(userId, {
    promptTokens,
    completionTokens,
    tokensUsed: totalTokens,
    estimatedCost,
  });
};

const incrementFailedRequest = async (userId) => incrementUsage(userId, { failedRequests: 1 });

const incrementQuotaViolation = async (userId) => incrementUsage(userId, { quotaViolations: 1 });

const getUsage = async (userId) => {
  const usage = await getUsageDocument(userId);
  return usage;
};

const getAdminSummary = async () => {
  const totalUsage = await Usage.aggregate([
    {
      $group: {
        _id: null,
        totalAiRequests: { $sum: '$aiRequests' },
        totalEmbeddingRequests: { $sum: '$embeddingRequests' },
        totalRepoClones: { $sum: '$repoClones' },
        totalTokens: { $sum: '$tokensUsed' },
        totalCost: { $sum: '$estimatedCost' },
        totalViolations: { $sum: '$quotaViolations' },
        totalFailures: { $sum: '$failedRequests' },
      },
    },
  ]);
  return totalUsage[0] || {};
};

module.exports = {
  getUsageDocument,
  getUsage,
  resetUsage,
  resetUsageIfNeeded,
  incrementUsage,
  incrementFailedRequest,
  incrementQuotaViolation,
  recordTokenUsage,
  scheduleDailyReset,
  getAdminSummary,
};
