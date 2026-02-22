'use strict';

const db = require('../config/database');

async function create({ userId, refreshToken, expiresAt }) {
  const { rows } = await db.query(
    `INSERT INTO sessions (user_id, refresh_token, expires_at)
     VALUES ($1, $2, $3) RETURNING *`,
    [userId, refreshToken, expiresAt]
  );
  return rows[0];
}

async function findByToken(refreshToken) {
  const { rows } = await db.query(
    'SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()',
    [refreshToken]
  );
  return rows[0] || null;
}

async function updateToken(sessionId, newRefreshToken, newExpiresAt) {
  await db.query(
    'UPDATE sessions SET refresh_token = $1, expires_at = $2 WHERE id = $3',
    [newRefreshToken, newExpiresAt, sessionId]
  );
}

async function deleteByToken(refreshToken) {
  await db.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
}

async function deleteAllForUser(userId) {
  await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

async function cleanExpired() {
  const { rowCount } = await db.query('DELETE FROM sessions WHERE expires_at <= NOW()');
  return rowCount;
}

module.exports = { create, findByToken, updateToken, deleteByToken, deleteAllForUser, cleanExpired };
