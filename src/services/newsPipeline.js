'use strict';

const gnewsService = require('./gnewsService');
const llmService = require('./llmService');
const articleModel = require('../models/articleModel');
const emailService = require('./emailService');

function generateBatchId() {
  // Use HKT (UTC+8) for batch ID
  const now = new Date();
  const hktMs = now.getTime() + 8 * 60 * 60 * 1000;
  const hkt = new Date(hktMs);
  const date = hkt.toISOString().slice(0, 10);
  const hour = String(hkt.getUTCHours()).padStart(2, '0');
  return `${date}-${hour}`;
}

async function runNewsPipeline(triggeredBy = 'scheduler') {
  const batchId = generateBatchId();
  console.log(`[Pipeline] Starting batch ${batchId}, triggered by: ${triggeredBy}`);

  try {
    // Step 1: Fetch from GNews (up to 30 articles)
    const rawArticles = await gnewsService.fetchBatch(batchId);
    console.log(`[Pipeline] Fetched ${rawArticles.length} raw articles`);

    // Step 2: Filter out already-stored articles
    const newArticles = await gnewsService.filterNewArticles(rawArticles);
    console.log(`[Pipeline] ${newArticles.length} new articles after dedup`);

    if (newArticles.length === 0) {
      console.log('[Pipeline] No new articles. Done.');
      return { batchId, articlesAdded: 0 };
    }

    // Step 3: LLM processing — categorize + summarize in 3 languages
    console.log('[Pipeline] Running LLM processing...');
    const llmResults = await llmService.processArticlesBatch(newArticles);

    // Step 4: Merge LLM results with raw article data
    const toInsert = newArticles.map((article, i) => {
      const llm = llmResults[i];
      if (llm) {
        return {
          ...article,
          category:      llm.category || 'ai-technology',
          title_zh_tw:   llm.title_zh_tw || null,
          title_zh_cn:   llm.title_zh_cn || null,
          summary_en:    llm.summary_en || null,
          summary_zh_tw: llm.summary_zh_tw || null,
          summary_zh_cn: llm.summary_zh_cn || null
        };
      }
      // LLM failed — use defaults
      return {
        ...article,
        category:      'ai-technology',
        title_zh_tw:   null,
        title_zh_cn:   null,
        summary_en:    (article.raw_content || '').substring(0, 300) || null,
        summary_zh_tw: null,
        summary_zh_cn: null
      };
    });

    // Step 5: Bulk insert into database
    const insertedCount = await articleModel.bulkInsert(toInsert);
    console.log(`[Pipeline] Inserted ${insertedCount} articles`);

    // Step 6: Send email digests (scheduler runs only)
    if (triggeredBy === 'scheduler' && insertedCount > 0) {
      console.log('[Pipeline] Sending email digests...');
      try {
        await emailService.sendDigestToAllSubscribers(batchId, toInsert);
      } catch (emailErr) {
        console.error('[Pipeline] Email digest error (non-fatal):', emailErr.message);
      }
    }

    console.log(`[Pipeline] Batch ${batchId} complete. ${insertedCount} articles added.`);
    return { batchId, articlesAdded: insertedCount };
  } catch (err) {
    console.error(`[Pipeline] Fatal error in batch ${batchId}:`, err.message);
    throw err;
  }
}

module.exports = { runNewsPipeline };
