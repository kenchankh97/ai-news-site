'use strict';

const axios = require('axios');
const articleModel = require('../models/articleModel');

const BASE_URL = 'https://gnews.io/api/v4';

// 3 queries × 10 articles = up to 30 per batch; 6 requests/day vs 100/day limit
const SEARCH_QUERIES = [
  'artificial intelligence',
  'machine learning AI',
  'AI technology ChatGPT'
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBatch(batchId) {
  const seen = new Set();
  const results = [];

  for (const query of SEARCH_QUERIES) {
    try {
      const response = await axios.get(`${BASE_URL}/search`, {
        params: {
          q: query,
          lang: 'en',
          country: 'any',
          max: 10,
          sortby: 'publishedAt',
          apikey: process.env.GNEWS_API_KEY
        },
        timeout: 15000
      });

      const articles = response.data.articles || [];
      for (const art of articles) {
        if (!art.url || seen.has(art.url)) continue;
        seen.add(art.url);
        results.push({
          gnews_url: art.url,
          title_en: art.title || '',
          source_name: art.source ? art.source.name : null,
          source_url: art.source ? art.source.url : null,
          image_url: art.image || null,
          published_at: art.publishedAt || null,
          raw_content: art.content || art.description || '',
          batch_id: batchId
        });
      }

      await sleep(600); // Respect rate limits
    } catch (err) {
      console.error(`[GNews] Query "${query}" failed:`, err.message);
    }
  }

  return results;
}

async function filterNewArticles(articles) {
  if (!articles.length) return [];
  const urls = articles.map(a => a.gnews_url);
  const existingUrls = await articleModel.getExistingUrls(urls);
  return articles.filter(a => !existingUrls.has(a.gnews_url));
}

module.exports = { fetchBatch, filterNewArticles };
