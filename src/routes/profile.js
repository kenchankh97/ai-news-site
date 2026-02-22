'use strict';

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/auth');
const { validateProfileUpdate } = require('../middleware/validateInput');

router.get('/', requireAuth, profileController.showProfile);
router.post('/', requireAuth, validateProfileUpdate, profileController.updateProfile);

module.exports = router;
