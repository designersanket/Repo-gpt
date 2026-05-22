const express = require('express');
const { getSettings, saveApiKey, deleteApiKey } = require('../controllers/userController');
const { protect } = require('./authMiddleware');

const router = express.Router();
router.use(protect);
router.get('/settings', getSettings);
router.post('/settings/api-key', saveApiKey);
router.delete('/settings/api-key', deleteApiKey);

module.exports = router;
