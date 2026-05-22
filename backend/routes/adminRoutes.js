const express = require('express');
const { getAdminSummary, getTopUsers, getViolationStats } = require('../controllers/adminController');
const { protect } = require('./authMiddleware');
const { ensureAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();
router.use(protect, ensureAdmin);
router.get('/summary', getAdminSummary);
router.get('/top-users', getTopUsers);
router.get('/violations', getViolationStats);

module.exports = router;
