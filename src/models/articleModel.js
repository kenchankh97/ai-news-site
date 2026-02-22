'use strict';

const db = require('../config/database');

async function getExistingUrls(urls) {
  if (!urls.length) return new Set();
  const { rows } = await db.query(
    'SELECT gnews_url FROM news_articles WHERE gnews_url = ANY($1)',
    [urls]
  );
  return new Set(rows.map(r => r.gnews_url));
}

async function bulkInsert(articles) {
  if (!articles.length) return 0;
  const client = await db.connect();
  let insertedCount = 0;

  try {
    await client.query('BEGIN');

    for (const a of articles) {
      const result = await client.query(
        `INSERT INTO news_articles (
          gnews_url, title_en, title_zh_tw, title_zh_cn,
          summary_en, summary_zh_tw, summary_zh_cn,
          source_name, source_url, image_url,
          category, published_at, batch_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (gnews_url) DO NOTHING
        RETURNING id`,
        [
          a.gnews_url, a.title_en, a.title_zh_tw || null, a.title_zh_cn || null,
          a.summary_en || null, a.summary_zh_tw || null, a.summary_zh_cn || null,
          a.source_name || null, a.source_url || null, a.image_url || null,
          a.category || 'ai-technology',
          a.published_at ? new Date(a.published_at) : null,
          a.batch_id || null
        ]
      );
      if (result.rowCount > 0) insertedCount++;
    }

    await client.query('COMMIT');
    return insertedCount;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getForFeed({ categories = null, limit = 30, offset = 0 } = {}) {
  const params = [limit, offset];
  let categoryFilter = '';

  if (categories && categories.length > 0 && categories.length < 4) {
    categoryFilter = 'AND category = ANY($3)';
    params.push(categories);
  }

  const { rows } = await db.query(
    `SELECT id, gnews_url, title_en, title_zh_tw, title_zh_cn,
            summary_en, summary_zh_tw, summary_zh_cn,
            source_name, source_url, image_url,
            category, published_at, fetched_at
     FROM news_articles
     WHERE is_active = TRUE ${categoryFilter}
     ORDER BY fetched_at DESC, published_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  return rows;
}

async function countForFeed({ categories = null } = {}) {
  const params = [];
  let categoryFilter = '';

  if (categories && categories.length > 0 && categories.length < 4) {
    categoryFilter = 'AND category = ANY($1)';
    params.push(categories);
  }

  const { rows } = await db.query(
    `SELECT COUNT(*) FROM news_articles WHERE is_active = TRUE ${categoryFilter}`,
    params
  );
  return parseInt(rows[0].count);
}

async function getByBatchId(batchId) {
  const { rows } = await db.query(
    `SELECT * FROM news_articles WHERE batch_id = $1 AND is_active = TRUE ORDER BY fetched_at DESC`,
    [batchId]
  );
  return rows;
}

module.exports = { getExistingUrls, bulkInsert, getForFeed, countForFeed, getByBatchId };
