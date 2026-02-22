'use strict';

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('pages/about', { pageTitle: 'About Your AI News' });
});

module.exports = router;
