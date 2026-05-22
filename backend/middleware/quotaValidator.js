const { getUsage, incrementUsage, incrementQuotaViolation } = require('../services/usageService');
const { DAILY_LIMITS } = require('../config/usageConfig');
const { failure } = require('../utils/apiResponse');

const validateAiQuota = async (req, res, next) => {
  const usage = await getUsage(req.user._id);
  if (usage.aiRequests + 1 > DAILY_LIMITS.aiRequests) {
    await incrementQuotaViolation(req.user._id);
    return failure(res, 429, 'QUOTA_EXCEEDED', 'Daily AI quota exceeded');
  }
  req.usage = usage;
  next();
};

const validateEmbeddingQuota = async (req, res, next) => {
  const usage = await getUsage(req.user._id);
  if (usage.embeddingRequests + 1 > DAILY_LIMITS.embeddingRequests) {
    await incrementQuotaViolation(req.user._id);
    return failure(res, 429, 'EMBEDDING_QUOTA_EXCEEDED', 'Daily embedding quota exceeded');
  }
  req.usage = usage;
  next();
};

const validateCloneQuota = async (req, res, next) => {
  const usage = await getUsage(req.user._id);
  if (usage.repoClones + 1 > DAILY_LIMITS.repoClones) {
    await incrementQuotaViolation(req.user._id);
    return failure(res, 429, 'CLONE_QUOTA_EXCEEDED', 'Daily repository clone quota exceeded');
  }
  req.usage = usage;
  next();
};

const validateRepoSize = async (req, res, next) => {
  const gitUrl = req.body.gitUrl;
  if (!gitUrl) {
    return failure(res, 400, 'INVALID_REQUEST', 'Please provide a gitUrl');
  }
  next();
};

module.exports = { validateAiQuota, validateEmbeddingQuota, validateCloneQuota, validateRepoSize };
