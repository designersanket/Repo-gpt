const axios = require('axios');
const { encrypt, decrypt } = require('../utils/crypto');

const PLATFORM_API_KEY = process.env.GLOBAL_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || null;
const PLATFORM_API_PROVIDER = process.env.GLOBAL_AI_PROVIDER || 'platform';

const validateApiKey = async (provider, apiKey) => {
  if (!provider || !apiKey) return false;

  try {
    if (provider === 'openai') {
      await axios.get('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });
      return true;
    }

    if (provider === 'gemini') {
      await axios.get(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`, {
        timeout: 10000,
      });
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
};

const encryptApiKey = (apiKey) => {
  return encrypt(apiKey);
};

const decryptApiKey = (encryptedKey) => {
  return decrypt(encryptedKey);
};

const resolveApiKeyForUser = (user) => {
  if (user?.apiKeyEncrypted && user?.apiProvider) {
    const decrypted = decryptApiKey(user.apiKeyEncrypted);
    if (decrypted) {
      return { apiKey: decrypted, apiProvider: user.apiProvider };
    }
  }
  return { apiKey: PLATFORM_API_KEY, apiProvider: PLATFORM_API_PROVIDER };
};

module.exports = {
  validateApiKey,
  encryptApiKey,
  decryptApiKey,
  resolveApiKeyForUser,
};
