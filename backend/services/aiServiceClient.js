const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: `${AI_SERVICE_URL}/api`,
  timeout: 300000,
});

const indexRepository = async (repoId, repoPath, gitUrl) => {
  try {
    const res = await aiClient.post('/index', {
      repo_id: repoId,
      repo_path: repoPath,
      git_url: gitUrl || null,
    });
    return res.data;
  } catch (error) {
    console.error('AI Service Index Request Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service indexing failed');
  }
};

const queryRepository = async (repoId, query, k = 6) => {
  try {
    const res = await aiClient.post('/query', { repo_id: repoId, query, k });
    return res.data;
  } catch (error) {
    console.error('AI Service Query Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service query failed');
  }
};

const getDependencies = async (repoId, repoPath, gitUrl) => {
  try {
    const res = await aiClient.post('/dependencies', {
      repo_id: repoId,
      repo_path: repoPath,
      git_url: gitUrl || null,
    });
    return res.data;
  } catch (error) {
    console.error('AI Service Dependency Analysis Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service dependency mapping failed');
  }
};

const summarizeCommits = async (repoPath, gitUrl) => {
  try {
    const res = await aiClient.post('/summarize-commits', {
      repo_path: repoPath,
      git_url: gitUrl || null,
    });
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
