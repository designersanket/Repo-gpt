const path = require('path');
const fs = require('fs');
const Repository = require('../models/Repository');
const gitService = require('../services/gitService');
const aiServiceClient = require('../services/aiServiceClient');
const socketHandler = require('../websocket/socketHandler');

const REPOSITORIES_DIR = process.env.REPOSITORIES_DIR
  ? path.resolve(process.env.REPOSITORIES_DIR)
  : path.resolve(__dirname, '../../repositories');

if (!fs.existsSync(REPOSITORIES_DIR)) {
  fs.mkdirSync(REPOSITORIES_DIR, { recursive: true });
}

const runBackgroundIndexing = async (repo, isZipUpload = false, tempZipPath = null) => {
  const repoId = repo._id.toString();
  const userId = repo.userId.toString();
  const repoPath = path.join(REPOSITORIES_DIR, repoId);

  try {
    if (isZipUpload && tempZipPath) {
      socketHandler.emitProgress(userId, repoId, 'cloning', 20);
      await gitService.extractZip(tempZipPath, repoPath);
      if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
    } else {
      socketHandler.emitProgress(userId, repoId, 'cloning', 5);
      await gitService.cloneRepository(repo.gitUrl, repoPath, (progress) => {
        socketHandler.emitCloneProgress(userId, repoId, progress);
        socketHandler.emitProgress(userId, repoId, 'cloning', progress.percentage);
      });
    }

    socketHandler.emitProgress(userId, repoId, 'parsing', 40);
    const languages = gitService.detectLanguages(repoPath);
    const fileTree = gitService.buildFileTree(repoPath);
    repo.languages = languages;
    repo.fileTree = fileTree;
    repo.status = 'parsing';
    await repo.save();

    socketHandler.emitProgress(userId, repoId, 'indexing', 70);
    await aiServiceClient.indexRepository(repoId, repoPath, repo.gitUrl);

    repo.status = 'ready';
    repo.progress = 100;
    await repo.save();
    socketHandler.emitProgress(userId, repoId, 'ready', 100);

  } catch (error) {
    console.error(`Ingestion error for repo ${repoId}:`, error);
    repo.status = 'failed';
    repo.error = error.message || 'Unknown ingestion error';
    repo.progress = 0;
    await repo.save();
    socketHandler.emitProgress(userId, repoId, 'failed', 0, error.message);

    if (fs.existsSync(repoPath)) {
      try {
        if (fs.readdirSync(repoPath).length === 0) await gitService.removeDir(repoPath);
      } catch (_) {}
    }
  }
};

// Helper: find repo owned by current user or 403
const findOwnedRepo = async (repoId, userId) => {
  const repo = await Repository.findOne({ _id: repoId, userId });
  return repo;
};

exports.cloneRepo = async (req, res) => {
  try {
    const { gitUrl, name } = req.body;
    if (!gitUrl) return res.status(400).json({ success: false, error: 'Please provide a Git URL' });

    const repoName = name || gitUrl.split('/').pop().replace('.git', '') || 'unnamed-repo';
    const repo = await Repository.create({
      name: repoName, gitUrl, status: 'cloning', progress: 10,
      pathOnDisk: 'pending', userId: req.user._id,
    });
    repo.pathOnDisk = path.join(REPOSITORIES_DIR, repo._id.toString());
    await repo.save();

    runBackgroundIndexing(repo, false);
    res.status(202).json({ success: true, message: 'Cloning started.', data: repo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.uploadZip = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Please upload a ZIP file' });

    const repoName = req.file.originalname.replace('.zip', '') || 'uploaded-zip';
    const repo = await Repository.create({
      name: repoName, gitUrl: 'uploaded_zip', status: 'cloning', progress: 10,
      pathOnDisk: 'pending', userId: req.user._id,
    });
    repo.pathOnDisk = path.join(REPOSITORIES_DIR, repo._id.toString());
    await repo.save();

    runBackgroundIndexing(repo, true, req.file.path);
    res.status(202).json({ success: true, message: 'ZIP upload accepted.', data: repo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRepos = async (req, res) => {
  try {
    const repos = await Repository.find({ userId: req.user._id })
      .select('-fileTree').sort('-createdAt');
    res.status(200).json({ success: true, data: repos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getRepoById = async (req, res) => {
  try {
    const repo = await findOwnedRepo(req.params.id, req.user._id);
    if (!repo) return res.status(404).json({ success: false, error: 'Repository not found' });
    res.status(200).json({ success: true, data: repo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteRepo = async (req, res) => {
  try {
    const repo = await findOwnedRepo(req.params.id, req.user._id);
    if (!repo) return res.status(404).json({ success: false, error: 'Repository not found' });

    if (fs.existsSync(repo.pathOnDisk)) await gitService.removeDir(repo.pathOnDisk);
    await repo.deleteOne();
    res.status(200).json({ success: true, message: 'Repository deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.reindexRepo = async (req, res) => {
  try {
    const repo = await findOwnedRepo(req.params.id, req.user._id);
    if (!repo) return res.status(404).json({ success: false, error: 'Repository not found' });

    repo.status = 'indexing';
    repo.progress = 60;
    repo.error = '';
    await repo.save();

    const userId = req.user._id.toString();
    const repoId = repo._id.toString();
    const repoPath = repo.pathOnDisk;

    (async () => {
      try {
        socketHandler.emitProgress(userId, repoId, 'indexing', 70);
        await aiServiceClient.indexRepository(repoId, repoPath, repo.gitUrl);
        repo.status = 'ready';
        repo.progress = 100;
        await repo.save();
        socketHandler.emitProgress(userId, repoId, 'ready', 100);
      } catch (err) {
        repo.status = 'failed';
        repo.error = err.message || 'Re-indexing failed';
        await repo.save();
        socketHandler.emitProgress(userId, repoId, 'failed', 0, repo.error);
      }
    })();

    res.status(202).json({ success: true, message: 'Re-indexing started.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFileContent = async (req, res) => {
  try {
    const repo = await findOwnedRepo(req.params.id, req.user._id);
    if (!repo) return res.status(404).json({ success: false, error: 'Repository not found' });

    const relativePath = req.query.path;
    if (!relativePath) return res.status(400).json({ success: false, error: 'Please provide a path parameter' });

    const absolutePath = path.resolve(repo.pathOnDisk, relativePath);
    if (!absolutePath.startsWith(path.resolve(repo.pathOnDisk))) {
      return res.status(403).json({ success: false, error: 'Access Denied: Path traversal detected.' });
    }
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, error: 'File does not exist' });
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    res.status(200).json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
