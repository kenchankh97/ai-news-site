'use strict';

const db = require('../config/database');

async function findById(id) {
  const { rows } = await db.query(
    'SELECT id, email, display_name, is_verified, password_hash, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function findByEmail(email) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

async function findByVerifyToken(token) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE verify_token = $1 AND verify_token_expires > NOW()',
    [token]
  );
  return rows[0] || null;
}

async function findByResetToken(token) {
  const { rows } = await db.query(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [token]
  );
  return rows[0] || null;
}

async function create({ email, displayName, verifyToken, verifyTokenExpires }) {
  const { rows } = await db.query(
    `INSERT INTO users (email, display_name, verify_token, verify_token_expires)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [email, displayName, verifyToken, verifyTokenExpires]
  );
  return rows[0];
}

async function verify(userId) {
  const { rows } = await db.query(
    `UPDATE users SET is_verified = TRUE, verify_token = NULL, verify_token_expires = NULL
     WHERE id = $1 RETURNING *`,
    [userId]
  );
  return rows[0];
}

async function setPassword(userId, passwordHash) {
  const { rows } = await db.query(
    `UPDATE users SET password_hash = $1, verify_token = NULL, verify_token_expires = NULL
     WHERE id = $2 RETURNING *`,
    [passwordHash, userId]
  );
  return rows[0];
}

async function setVerifyToken(userId, verifyToken, verifyTokenExpires) {
  await db.query(
    'UPDATE users SET verify_token = $1, verify_token_expires = $2 WHERE id = $3',
    [verifyToken, verifyTokenExpires, userId]
  );
}

async function setResetToken(userId, resetToken, resetTokenExpires) {
  await db.query(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
    [resetToken, resetTokenExpires, userId]
  );
}

async function resetPassword(userId, passwordHash) {
  await db.query(
    `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
    [passwordHash, userId]
  );
}

async function updateDisplayName(userId, displayName) {
  await db.query(
    'UPDATE users SET display_name = $1 WHERE id = $2',
    [displayName, userId]
  );
}

module.exports = {
  findById, findByEmail, findByVerifyToken, findByResetToken,
  create, verify, setPassword, setVerifyToken, setResetToken, resetPassword, updateDisplayName
};
