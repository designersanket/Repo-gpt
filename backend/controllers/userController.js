const User = require('../models/User');
const { success, failure } = require('../utils/apiResponse');
const { getUsage } = require('../services/usageService');
const { validateApiKey, encryptApiKey, decryptApiKey } = require('../services/apiKeyService');

exports.getSettings = async (req, res) => {
  try {
    const usage = await getUsage(req.user._id);
    const user = await User.findById(req.user._id).select('-password -apiKeyEncrypted');
    return success(res, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        apiProvider: user.apiProvider || 'platform',
        hasCustomApiKey: Boolean(user.apiKeyEncrypted),
        isAdmin: Boolean(user.isAdmin),
        createdAt: user.createdAt,
      },
      usage,
      limits: {
        aiRequests: process.env.DAILY_AI_CHAT_LIMIT || 20,
        repoClones: process.env.DAILY_REPO_CLONE_LIMIT || 3,
        embeddingRequests: process.env.DAILY_EMBEDDING_LIMIT || 5,
      },
    });
  } catch (error) {
    return failure(res, 500, 'SETTINGS_FETCH_FAILED', 'Unable to fetch settings');
  }
};

exports.saveApiKey = async (req, res) => {
  try {
    const { apiKey, apiProvider } = req.body;
    if (!apiKey || !apiProvider) {
      return failure(res, 400, 'INVALID_REQUEST', 'Please provide apiKey and apiProvider');
    }
    const valid = await validateApiKey(apiProvider, apiKey);
    if (!valid) {
      return failure(res, 400, 'INVALID_API_KEY', 'Provided API key or provider is invalid');
    }
    const encrypted = encryptApiKey(apiKey);
    await User.findByIdAndUpdate(req.user._id, {
      apiKeyEncrypted: encrypted,
      apiProvider,
      apiKeySetAt: new Date(),
    });
    return success(res, null, 'API key saved securely.');
  } catch (error) {
    return failure(res, 500, 'API_KEY_SAVE_FAILED', 'Unable to save API key');
  }
};

exports.deleteApiKey = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { apiKeyEncrypted: 1, apiProvider: 1, apiKeySetAt: 1 },
    });
    return success(res, null, 'User API key removed.');
  } catch (error) {
    return failure(res, 500, 'API_KEY_REMOVE_FAILED', 'Unable to remove API key');
  }
};
