'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

const isProd = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000
};

const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  maxAge: REFRESH_EXPIRES_MS
};

function signAccessToken(userId) {
  return jwt.sign(
    { sub: userId, type: 'access' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

function signRefreshToken(userId, sessionId) {
  return jwt.sign(
    { sub: userId, sid: sessionId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

function refreshExpiresAt() {
  return new Date(Date.now() + REFRESH_EXPIRES_MS);
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTS);
  res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTS);
}

function clearAuthCookies(res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
}

module.exports = {
  signAccessToken, signRefreshToken,
  verifyAccessToken, verifyRefreshToken,
  refreshExpiresAt, setAuthCookies, clearAuthCookies,
  REFRESH_COOKIE_OPTS
};
