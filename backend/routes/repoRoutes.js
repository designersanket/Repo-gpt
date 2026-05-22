const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloneRepo, uploadZip, getRepos, getRepoById, deleteRepo, getFileContent, reindexRepo, refreshEmbeddings } = require('../controllers/repoController');
const { protect } = require('./authMiddleware');
const { validateCloneQuota, validateEmbeddingQuota } = require('../middleware/quotaValidator');

const router = express.Router();

// Configure multer for temp ZIP uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB zip limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip') {
      return cb(new Error('Only ZIP files are supported.'));
    }
    cb(null, true);
  },
});

router.post('/clone', protect, validateCloneQuota, cloneRepo);
router.post('/upload', protect, upload.single('file'), uploadZip);
router.post('/:id/reindex', protect, reindexRepo);
router.post('/:id/embeddings/refresh', protect, validateEmbeddingQuota, refreshEmbeddings);
router.get('/', protect, getRepos);
router.get('/:id', protect, getRepoById);
router.get('/:id/file', protect, getFileContent);
router.delete('/:id', protect, deleteRepo);

module.exports = router;
