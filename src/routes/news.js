'use strict';

const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { requireAuth } = require('../middleware/auth');
const { refreshLimiter } = require('../middleware/rateLimiter');

// Manual news refresh — authenticated, rate limited
router.post('/refresh', requireAuth, refreshLimiter, newsController.manualRefresh);

module.exports = router;
