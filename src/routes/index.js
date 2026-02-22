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

  // Query params with fallback to user's first preferred language
  const defaultLang = userPrefs
    ? (Array.isArray(userPrefs.languages) && userPrefs.languages[0]) || userPrefs.language || 'en'
    : 'en';
  const lang = LANGUAGE_CODES.includes(req.query.lang) ? req.query.lang : defaultLang;

  const activeCategory = req.query.category || 'all';
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  // Category filter:
  // - Specific tab selected → filter to that one category
  // - "All" tab for logged-in user with <4 categories → apply their preferences
  // - "All" tab with no preferences or all 4 selected → no filter (show everything)
  const validCats = ['ai-business', 'ai-technology', 'ai-ethics', 'ai-research'];
  let categoryFilter = null;
  if (activeCategory !== 'all' && validCats.includes(activeCategory)) {
    categoryFilter = [activeCategory];
  } else if (userPrefs?.categories && userPrefs.categories.length < 4) {
    categoryFilter = userPrefs.categories;
  }

  const [articles, total] = await Promise.all([
    articleModel.getForFeed({ categories: categoryFilter, limit: PAGE_SIZE, offset }),
    articleModel.countForFeed({ categories: categoryFilter })
  ]);

  const hasMore = offset + articles.length < total;

  // Only show tabs for categories the user has selected (guests see all 4)
  const visibleCategories = (userPrefs?.categories?.length > 0 && userPrefs.categories.length < 4)
    ? CATEGORIES.filter(cat => userPrefs.categories.includes(cat.slug))
    : CATEGORIES;

  res.render('pages/home', {
    pageTitle: 'AI News Feed',
    pageDescription: 'Latest AI news, summarized and translated — updated twice daily.',
    articles,
    lang,
    activeCategory,
    categories: visibleCategories,
    page,
    hasMore
  });
});

module.exports = router;
