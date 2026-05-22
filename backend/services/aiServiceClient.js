const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: `${AI_SERVICE_URL}/api`,
  timeout: 300000,
});

const buildPayload = (basePayload, options = {}) => {
  if (options.apiKey) {
    return { ...basePayload, api_key: options.apiKey, api_provider: options.apiProvider || 'platform' };
  }
  return { ...basePayload };
};

const indexRepository = async (repoId, repoPath, gitUrl, options = {}) => {
  try {
    const payload = buildPayload({
      repo_id: repoId,
      repo_path: repoPath,
      git_url: gitUrl || null,
      repo_hash: options.repoHash || null,
    }, options);
    const res = await aiClient.post('/index', payload);
    return res.data;
  } catch (error) {
    console.error('AI Service Index Request Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service indexing failed');
  }
};

const queryRepository = async (repoId, query, k = 6, options = {}) => {
  try {
    const payload = buildPayload({ repo_id: repoId, query, k }, options);
    const res = await aiClient.post('/query', payload);
    return res.data;
  } catch (error) {
    console.error('AI Service Query Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service query failed');
  }
};

const getDependencies = async (repoId, repoPath, gitUrl, options = {}) => {
  try {
    const payload = buildPayload({
      repo_id: repoId,
      repo_path: repoPath,
      git_url: gitUrl || null,
    }, options);
    const res = await aiClient.post('/dependencies', payload);
    return res.data;
  } catch (error) {
    console.error('AI Service Dependency Analysis Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service dependency mapping failed');
  }
};

const summarizeCommits = async (repoPath, gitUrl, options = {}) => {
  try {
    const payload = buildPayload({
      repo_path: repoPath,
      git_url: gitUrl || null,
    }, options);
    const res = await aiClient.post('/summarize-commits', payload);
    return res.data;
  } catch (error) {
    console.error('AI Service Commit Summarization Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service commit summary failed');
  }
};

module.exports = {
  indexRepository,
  queryRepository,
  getDependencies,
  summarizeCommits,
};
