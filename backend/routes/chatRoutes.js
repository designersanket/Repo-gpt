const express = require('express');
const { queryRepo, getChatHistory, getDependenciesGraph, getCommitSummary } = require('../controllers/chatController');
const { protect } = require('./authMiddleware');
const { validateAiQuota } = require('../middleware/quotaValidator');

const router = express.Router();

router.post('/query', protect, validateAiQuota, queryRepo);
router.get('/history/:repoId', protect, getChatHistory);
router.get('/dependencies/:repoId', protect, getDependenciesGraph);
router.get('/commits/:repoId', protect, getCommitSummary);

module.exports = router;
