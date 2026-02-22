'use strict';

const express = require('express');
const router = express.Router();
const articleModel = require('../models/articleModel');
const preferenceModel = require('../models/preferenceModel');
const { CATEGORIES, LANGUAGE_CODES } = require('../config/constants');

const PAGE_SIZE = 30;

router.get('/', async (req, res) => {
  // Get user preferences to set defaults
  let userPrefs = null;
  if (req.user) {
    userPrefs = await preferenceModel.findByUserId(req.user.id).catch(() => null);
  }

  // Query params with fallback to user prefs
  const lang = LANGUAGE_CODES.includes(req.query.lang)
    ? req.query.lang
    : (userPrefs ? userPrefs.language : 'en');

  const activeCategory = req.query.category || 'all';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Category filter
  const categoryFilter = activeCategory === 'all' ? null :
    (userPrefs && req.query.category === undefined
      ? userPrefs.categories
      : [activeCategory].filter(c => ['ai-business', 'ai-technology', 'ai-ethics', 'ai-research'].includes(c)));

  const [articles, total] = await Promise.all([
    articleModel.getForFeed({ categories: categoryFilter, limit: PAGE_SIZE, offset }),
    articleModel.countForFeed({ categories: categoryFilter })
  ]);

  const hasMore = offset + articles.length < total;

  res.render('pages/home', {
    pageTitle: 'AI News Feed',
    pageDescription: 'Latest AI news, summarized and translated — updated twice daily.',
    articles,
    lang,
    activeCategory,
    categories: CATEGORIES,
    page,
    hasMore
  });
});

module.exports = router;
