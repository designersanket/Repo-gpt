const path = require('path');
const fs = require('fs');
const Repository = require('../models/Repository');
const gitService = require('../services/gitService');
const aiServiceClient = require('../services/aiServiceClient');
const socketHandler = require('../websocket/socketHandler');

const REPOSITORIES_DIR = process.env.REPOSITORIES_DIR
  ? path.resolve(process.env.REPOSITORIES_DIR)
  : path.resolve(__dirname, '../../repositories');

// Ensure base dir exists
if (!fs.existsSync(REPOSITORIES_DIR)) {
  fs.mkdirSync(REPOSITORIES_DIR, { recursive: true });
}

/**
 * Helper to process background indexing.
 */
const runBackgroundIndexing = async (repo, isZipUpload = false, tempZipPath = null) => {
  const repoId = repo._id.toString();
  const repoPath = path.join(REPOSITORIES_DIR, repoId);

  try {
    // 1. Clone or Extract
    if (isZipUpload && tempZipPath) {
      socketHandler.emitProgress(repoId, 'cloning', 20);
      await gitService.extractZip(tempZipPath, repoPath);
      if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
    } else {
      socketHandler.emitProgress(repoId, 'cloning', 5);
      await gitService.cloneRepository(repo.gitUrl, repoPath, (progress) => {
        socketHandler.emitCloneProgress(repoId, progress);
        socketHandler.emitProgress(repoId, 'cloning', progress.percentage);
      });
    }

    // 2. Scan & Parse AST structure
    socketHandler.emitProgress(repoId, 'parsing', 40);
    const languages = gitService.detectLanguages(repoPath);
    const fileTree = gitService.buildFileTree(repoPath);

    repo.languages = languages;
    repo.fileTree = fileTree;
    repo.status = 'parsing';
    await repo.save();

    // 3. Trigger FAISS embeddings and indexing in python service
    socketHandler.emitProgress(repoId, 'indexing', 70);
    await aiServiceClient.indexRepository(repoId, repoPath);

    // 4. Ingestion complete
    repo.status = 'ready';
    repo.progress = 100;
    await repo.save();
    
    socketHandler.emitProgress(repoId, 'ready', 100);
    console.log(`Repository ${repo.name} (${repoId}) is ready.`);

  } catch (error) {
    console.error(`Ingestion error for repo ${repoId}:`, error);
    repo.status = 'failed';
    repo.error = error.message || 'Unknown ingestion error';
    repo.progress = 0;
    await repo.save();
    socketHandler.emitProgress(repoId, 'failed', 0, repo.error);
    
    // Only clean up directory if it failed during cloning (directory is empty)
    if (fs.existsSync(repoPath)) {
      try {
        const contents = fs.readdirSync(repoPath);
        if (contents.length === 0) {
          await gitService.removeDir(repoPath);
        }
      } catch (_) {}
    }
  }
};

/**
 * @desc    Clone a repository from Git URL
 * @route   POST /api/repos/clone
 */
exports.cloneRepo = async (req, res) => {
  try {
    const { gitUrl, name } = req.body;

    if (!gitUrl) {
      return res.status(400).json({ success: false, error: 'Please provide a Git URL' });
    }

    const repoName = name || gitUrl.split('/').pop().replace('.git', '') || 'unnamed-repo';
    const repoPath = path.join(REPOSITORIES_DIR, 'temp_placeholder'); // Filled asynchronously

    const repo = await Repository.create({
      name: repoName,
      gitUrl,
      status: 'cloning',
      progress: 10,
      pathOnDisk: 'pending',
      owner: req.user?._id,
    });

    const repoId = repo._id.toString();
    repo.pathOnDisk = path.join(REPOSITORIES_DIR, repoId);
    await repo.save();

    // Trigger background thread pipeline
    runBackgroundIndexing(repo, false);

    res.status(202).json({
      success: true,
      message: 'Repository cloning and indexing started in the background.',
      data: repo,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Upload repository as ZIP file
 * @route   POST /api/repos/upload
 */
exports.uploadZip = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a ZIP file' });
    }

    const tempZipPath = req.file.path;
    const originalName = req.file.originalname;
    const repoName = originalName.replace('.zip', '') || 'uploaded-zip';

    const repo = await Repository.create({
      name: repoName,
      gitUrl: 'uploaded_zip',
      status: 'cloning',
      progress: 10,
      pathOnDisk: 'pending',
      owner: req.user?._id,
    });

    const repoId = repo._id.toString();
    repo.pathOnDisk = path.join(REPOSITORIES_DIR, repoId);
    await repo.save();

    // Trigger background thread pipeline for zip extraction and parsing
    runBackgroundIndexing(repo, true, tempZipPath);

    res.status(202).json({
      success: true,
      message: 'ZIP upload accepted, indexing started in the background.',
      data: repo,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get all repositories (excluding large fileTree)
 * @route   GET /api/repos
 */
exports.getRepos = async (req, res) => {
  try {
    const repos = await Repository.find({ owner: req.user?._id })
      .select('-fileTree') // Exclude file tree for list view size performance
      .sort('-createdAt');
    res.status(200).json({ success: true, data: repos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get single repository by ID with fileTree
 * @route   GET /api/repos/:id
 */
exports.getRepoById = async (req, res) => {
  try {
    const repo = await Repository.findById(req.params.id);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }
    res.status(200).json({ success: true, data: repo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Delete repository index and folder
 * @route   DELETE /api/repos/:id
 */
exports.deleteRepo = async (req, res) => {
  try {
    const repo = await Repository.findById(req.params.id);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const repoPath = repo.pathOnDisk;

    // Delete folder from filesystem
    if (fs.existsSync(repoPath)) {
      await gitService.removeDir(repoPath);
    }

    // Call Python AI Service to delete FAISS index
    try {
      // Create a cleanup route or delete the local storage folder on disk in Python service
      const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const axios = require('axios');
      // In this setup we can call AI service if we implement index deletion.
      // Even if it fails, we proceed to clean DB.
    } catch (err) {
      console.error('Failed to notify AI service of deletion:', err.message);
    }

    await repo.deleteOne();

    res.status(200).json({ success: true, message: 'Repository deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Re-trigger FAISS indexing for an already-cloned repository
 * @route   POST /api/repos/:id/reindex
 */
exports.reindexRepo = async (req, res) => {
  try {
    const repo = await Repository.findById(req.params.id);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const repoPath = repo.pathOnDisk;
    if (!fs.existsSync(repoPath)) {
      return res.status(400).json({ success: false, error: 'Repository files not found on disk. Please re-clone.' });
    }

    repo.status = 'indexing';
    repo.progress = 60;
    repo.error = '';
    await repo.save();

    // Run indexing in background
    (async () => {
      try {
        socketHandler.emitProgress(repo._id.toString(), 'indexing', 70);
        await aiServiceClient.indexRepository(repo._id.toString(), repoPath);
        repo.status = 'ready';
        repo.progress = 100;
        await repo.save();
        socketHandler.emitProgress(repo._id.toString(), 'ready', 100);
      } catch (err) {
        console.error('Re-index failed:', err);
        repo.status = 'failed';
        repo.error = err.message || 'Re-indexing failed';
        await repo.save();
        socketHandler.emitProgress(repo._id.toString(), 'failed', 0, repo.error);
      }
    })();

    res.status(202).json({ success: true, message: 'Re-indexing started.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Get file contents safely by relative path
 * @route   GET /api/repos/:id/file
 */
exports.getFileContent = async (req, res) => {
  try {
    const repo = await Repository.findById(req.params.id);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const relativePath = req.query.path;
    if (!relativePath) {
      return res.status(400).json({ success: false, error: 'Please provide a path parameter' });
    }

    // Security check: Prevent path traversal outside the repository root
    const absolutePath = path.resolve(repo.pathOnDisk, relativePath);
    const repoRootDir = path.resolve(repo.pathOnDisk);

    if (!absolutePath.startsWith(repoRootDir)) {
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
