'use strict';

const newsPipeline = require('../services/newsPipeline');

async function manualRefresh(req, res) {
  try {
    const result = await newsPipeline.runNewsPipeline('manual');
    return res.json({
      success: true,
      articlesAdded: result.articlesAdded,
      message: result.articlesAdded > 0
        ? `${result.articlesAdded} new article${result.articlesAdded > 1 ? 's' : ''} added.`
        : 'No new articles found. Check back later.'
    });
  } catch (err) {
    console.error('[NewsCtrl] Manual refresh failed:', err);
    return res.status(500).json({ success: false, message: 'Refresh failed. Please try again.' });
  }
}

module.exports = { manualRefresh };
