'use strict';

const db = require('../config/database');

const DEFAULT_CATEGORIES = ['ai-business', 'ai-technology', 'ai-ethics', 'ai-research'];
const DEFAULT_LANGUAGES  = ['en'];

async function findByUserId(userId) {
  const { rows } = await db.query(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [userId]
  );
  if (rows[0]) return rows[0];
  // Return defaults if not set yet
  return {
    user_id: userId,
    languages: DEFAULT_LANGUAGES,
    categories: DEFAULT_CATEGORIES,
    email_digest: true
  };
}

async function upsert(userId, { languages, categories, emailDigest }) {
  const { rows } = await db.query(
    `INSERT INTO user_preferences (user_id, languages, categories, email_digest)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET languages = EXCLUDED.languages,
           categories = EXCLUDED.categories,
           email_digest = EXCLUDED.email_digest,
           updated_at = NOW()
     RETURNING *`,
    [userId, languages, categories, emailDigest]
  );
  return rows[0];
}

async function createDefaults(userId) {
  const { rows } = await db.query(
    `INSERT INTO user_preferences (user_id, languages, categories, email_digest)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [userId, DEFAULT_LANGUAGES, DEFAULT_CATEGORIES]
  );
  return rows[0];
}

// Get all subscribed users with their preferences (for email digest)
async function getDigestSubscribers() {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.display_name, up.languages, up.categories, up.email_digest
     FROM users u
     JOIN user_preferences up ON u.id = up.user_id
     WHERE u.is_verified = TRUE
       AND up.email_digest = TRUE`
  );
  return rows;
}

module.exports = { findByUserId, upsert, createDefaults, getDigestSubscribers };
