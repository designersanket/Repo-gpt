const Repository = require('../models/Repository');
const ChatMessage = require('../models/ChatMessage');
const aiServiceClient = require('../services/aiServiceClient');

/**
 * @desc    Query the codebase using semantic RAG
 * @route   POST /api/chat/query
 */
exports.queryRepo = async (req, res) => {
  try {
    const { repoId, query } = req.body;

    if (!repoId || !query) {
      return res.status(400).json({ success: false, error: 'Please provide repoId and query text.' });
    }

    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    if (repo.status !== 'ready') {
      return res.status(400).json({
        success: false,
        error: `Repository is not indexed yet. Current status: ${repo.status}`,
      });
    }

    // 1. Save user query in DB
    await ChatMessage.create({
      repoId,
      role: 'user',
      message: query,
      owner: req.user?._id,
    });

    // 2. Query Python AI Service (FastAPI)
    const aiResponse = await aiServiceClient.queryRepository(repoId, query);

    // 3. Save Assistant response with citations
    const assistantMessage = await ChatMessage.create({
      repoId,
      role: 'assistant',
      message: aiResponse.answer,
      references: aiResponse.references,
      owner: req.user?._id,
    });

    res.status(200).json({
      success: true,
      data: {
        answer: aiResponse.answer,
        references: aiResponse.references,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get chat message logs for a repository
 * @route   GET /api/chat/history/:repoId
 */
exports.getChatHistory = async (req, res) => {
  try {
    const { repoId } = req.params;
    const history = await ChatMessage.find({
      repoId,
      owner: req.user?._id,
    }).sort('createdAt');

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Fetch AST-based Import Graph
 * @route   GET /api/chat/dependencies/:repoId
 */
exports.getDependenciesGraph = async (req, res) => {
  try {
    const { repoId } = req.params;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const graph = await aiServiceClient.getDependencies(repoId, repo.pathOnDisk, repo.gitUrl);
    res.status(200).json({ success: true, data: graph });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Summarize Git commits using Gemini Flash
 * @route   GET /api/chat/commits/:repoId
 */
exports.getCommitSummary = async (req, res) => {
  try {
    const { repoId } = req.params;
    const repo = await Repository.findById(repoId);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const summary = await aiServiceClient.summarizeCommits(repo.pathOnDisk, repo.gitUrl);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
