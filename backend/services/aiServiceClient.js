const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const aiClient = axios.create({
  baseURL: `${AI_SERVICE_URL}/api`,
  timeout: 300000, // Large timeout for indexing (5 minutes)
});

/**
 * Triggers FAISS indexing in the Python AI Service.
 */
const indexRepository = async (repoId, repoPath) => {
  try {
    const res = await aiClient.post('/index', {
      repo_id: repoId,
      repo_path: repoPath,
    });
    return res.data;
  } catch (error) {
    console.error('AI Service Index Request Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service indexing failed');
  }
};

/**
 * Queries the FAISS RAG system.
 */
const queryRepository = async (repoId, query, k = 6) => {
  try {
    const res = await aiClient.post('/query', {
      repo_id: repoId,
      query,
      k,
    });
    return res.data;
  } catch (error) {
    console.error('AI Service Query Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service query failed');
  }
};

/**
 * Extracts imports graph connections.
 */
const getDependencies = async (repoId, repoPath) => {
  try {
    const res = await aiClient.post('/dependencies', {
      repo_id: repoId,
      repo_path: repoPath,
    });
    return res.data;
  } catch (error) {
    console.error('AI Service Dependency Analysis Failed:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'AI Service dependency mapping failed');
  }
};

/**
 * Summarizes commits logs.
 */
const summarizeCommits = async (repoPath) => {
  try {
    const res = await aiClient.post('/summarize-commits', {
      repo_path: repoPath,
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
