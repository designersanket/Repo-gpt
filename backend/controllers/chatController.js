const Repository = require('../models/Repository');
const ChatMessage = require('../models/ChatMessage');
const aiServiceClient = require('../services/aiServiceClient');

// Helper: find repo owned by current user
const findOwnedRepo = async (repoId, userId) =>
  Repository.findOne({ _id: repoId, userId });

exports.queryRepo = async (req, res) => {
  try {
    const { repoId, query } = req.body;
    if (!repoId || !query) {
      return res.status(400).json({ success: false, error: 'Please provide repoId and query.' });
    }

    const repo = await findOwnedRepo(repoId, req.user._id);
    if (!repo) return res.status(404).json({ success: false, error: 'Repository not found' });
    if (repo.status !== 'ready') {
      return res.status(400).json({ success: false, error: `Repository not indexed yet. Status: ${repo.status}` });
    }

    await ChatMessage.create({ repoId, userId: req.user._id, role: 'user', message: query });

    const aiResponse = await aiServiceClient.queryRepository(repoId, query);

    await ChatMessage.create({
      repoId, userId: req.user._id, role: 'assistant',
      message: aiResponse.answer, references: aiResponse.references,
    });

    res.status(200).json({ success: true, data: { answer: aiResponse.answer, references: aiResponse.references } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const history = await ChatMessage.find({
      repoId: req.params.repoId,
      userId: req.user._id,
    }).sort('createdAt');
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDependenciesGraph = async (req, res) => {
  try {
    const repo = await findOwnedRepo(req.params.repoId, req.user._id);
    if (!repo) return res.status(404).json({ success: false, error: 'Repository not found' });

    const graph = await aiServiceClient.getDependencies(repo._id.toString(), repo.pathOnDisk, repo.gitUrl);
    res.status(200).json({ success: true, data: graph });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCommitSummary = async (req, res) => {
  try {
    const repo = await findOwnedRepo(req.params.repoId, req.user._id);
    if (!repo) return res.status(404).json({ success: false, error: 'Repository not found' });

    const summary = await aiServiceClient.summarizeCommits(repo.pathOnDisk, repo.gitUrl);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
