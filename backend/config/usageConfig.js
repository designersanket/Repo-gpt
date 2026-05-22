const DEFAULTS = {
  DAILY_AI_CHAT_LIMIT: 20,
  DAILY_REPO_CLONE_LIMIT: 3,
  DAILY_EMBEDDING_LIMIT: 5,
  MAX_REPO_SIZE_MB: 20,
  MAX_REPO_FILE_COUNT: 300,
  COST_PER_TOKEN_USD: 0.00002,
};

module.exports = {
  DAILY_LIMITS: {
    aiRequests: parseInt(process.env.DAILY_AI_CHAT_LIMIT, 10) || DEFAULTS.DAILY_AI_CHAT_LIMIT,
    repoClones: parseInt(process.env.DAILY_REPO_CLONE_LIMIT, 10) || DEFAULTS.DAILY_REPO_CLONE_LIMIT,
    embeddingRequests: parseInt(process.env.DAILY_EMBEDDING_LIMIT, 10) || DEFAULTS.DAILY_EMBEDDING_LIMIT,
    maxRepoSizeMB: parseInt(process.env.MAX_REPO_SIZE_MB, 10) || DEFAULTS.MAX_REPO_SIZE_MB,
    maxRepoFiles: parseInt(process.env.MAX_REPO_FILE_COUNT, 10) || DEFAULTS.MAX_REPO_FILE_COUNT,
    costPerToken: parseFloat(process.env.COST_PER_TOKEN_USD) || DEFAULTS.COST_PER_TOKEN_USD,
  },
};
