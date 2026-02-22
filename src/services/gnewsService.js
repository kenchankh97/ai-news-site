'use strict';

const axios = require('axios');
const articleModel = require('../models/articleModel');

const BASE_URL = 'https://gnews.io/api/v4';

// 3 queries × 10 articles = up to 30 per batch; 6 requests/day vs 100/day limit
// Simple single-topic queries work best with GNews search; country:'us' filters to US sources
const SEARCH_QUERIES = [
  'artificial intelligence',
  'machine learning',
  'AI regulation'
];

// Open-access US tech sources (no paywall) — used to prioritise results
// Deliberately excludes WSJ, NYT, WaPo, Bloomberg which redirect non-subscribers to homepage
const US_SOURCE_DOMAINS = new Set([
  'techcrunch.com', 'theverge.com', 'wired.com', 'venturebeat.com',
  'arstechnica.com', 'engadget.com', 'zdnet.com', 'cnet.com',
  'cnbc.com', 'reuters.com', 'apnews.com', 'axios.com',
  'fortune.com', 'forbes.com', 'businessinsider.com', 'gizmodo.com',
  'technologyreview.com', 'ieee.org', 'theatlantic.com',
  'openai.com', 'anthropic.com', 'deepmind.com', 'nvidia.com',
  'towardsdatascience.com', 'machinelearningmastery.com'
]);

function isUSSource(sourceUrl) {
  if (!sourceUrl) return false;
  try {
    const host = new URL(sourceUrl).hostname.replace('www.', '');
    return US_SOURCE_DOMAINS.has(host);
  } catch { return false; }
}

// Reject root-level or near-root URLs — these are source homepages, not articles
function isArticleUrl(url) {
  if (!url) return false;
  try {
    const pathname = new URL(url).pathname;
    return pathname.length > 10; // e.g. '/' or '/ai/' are too short to be articles
  } catch { return false; }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBatch(batchId) {
  const seen = new Set();
  const usResults = [];
  const otherResults = [];

  for (const query of SEARCH_QUERIES) {
    try {
      const response = await axios.get(`${BASE_URL}/search`, {
        params: {
          q: query,
          lang: 'en',
          country: 'us',
          max: 10,
          sortby: 'publishedAt',
          apikey: process.env.GNEWS_API_KEY
        },
        timeout: 15000
      });

      const articles = response.data.articles || [];
      console.log(`[GNews] Query "${query}" → ${articles.length} results`);

      for (const art of articles) {
        if (!art.url || seen.has(art.url) || !isArticleUrl(art.url)) continue;
        seen.add(art.url);
        const entry = {
          gnews_url: art.url,
          title_en: art.title || '',
          source_name: art.source ? art.source.name : null,
          source_url: art.source ? art.source.url : null,
          image_url: art.image || null,
          published_at: art.publishedAt || null,
          raw_content: art.content || art.description || '',
          batch_id: batchId
        };
        if (isUSSource(entry.source_url)) {
          usResults.push(entry);
        } else {
          otherResults.push(entry);
        }
      }

      await sleep(600); // Respect rate limits
    } catch (err) {
      console.error(`[GNews] Query "${query}" failed:`, err.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).substring(0, 150)}`
        : err.message);
    }
  }

  // Prefer US sources; fall back to others if we don't have enough
  const combined = [...usResults, ...otherResults];
  console.log(`[GNews] ${usResults.length} US sources + ${otherResults.length} other sources = ${combined.length} total`);
  return combined;
}

async function filterNewArticles(articles) {
  if (!articles.length) return [];
  const urls = articles.map(a => a.gnews_url);
  const existingUrls = await articleModel.getExistingUrls(urls);
  return articles.filter(a => !existingUrls.has(a.gnews_url));
}

module.exports = { fetchBatch, filterNewArticles };
