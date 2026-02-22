'use strict';

const tokenService = require('../services/tokenService');
const sessionModel = require('../models/sessionModel');
const userModel = require('../models/userModel');

// Attempt to authenticate from cookies; sets req.user if successful (non-blocking)
async function authenticate(req, res, next) {
  const accessToken = req.cookies && req.cookies['access_token'];
  const refreshToken = req.cookies && req.cookies['refresh_token'];

  if (!accessToken && !refreshToken) {
    req.user = null;
    return next();
  }

  // Try access token first
  if (accessToken) {
    try {
      const decoded = tokenService.verifyAccessToken(accessToken);
      req.user = await userModel.findById(decoded.sub);
      return next();
    } catch (e) {
      // Access token invalid or expired — fall through to refresh
    }
  }

  // Try refresh token rotation
  if (refreshToken) {
    try {
      const decoded = tokenService.verifyRefreshToken(refreshToken);
      const session = await sessionModel.findByToken(refreshToken);
      if (!session) {
        tokenService.clearAuthCookies(res);
        req.user = null;
        return next();
      }

      const user = await userModel.findById(decoded.sub);
      if (!user) {
        tokenService.clearAuthCookies(res);
        req.user = null;
        return next();
      }

      // Rotate tokens
      const newAccess = tokenService.signAccessToken(user.id);
      const newRefresh = tokenService.signRefreshToken(user.id, session.id);
      const newExpiry = tokenService.refreshExpiresAt();
      await sessionModel.updateToken(session.id, newRefresh, newExpiry);
      tokenService.setAuthCookies(res, newAccess, newRefresh);

      req.user = user;
      return next();
    } catch (e) {
      tokenService.clearAuthCookies(res);
      req.user = null;
      return next();
    }
  }

  req.user = null;
  next();
}

// Gate protected routes — redirect to login if not authenticated
// For /api/ routes (AJAX/fetch), return JSON 401 instead of an HTML redirect
function requireAuth(req, res, next) {
  if (!req.user) {
    console.warn(`[Auth] requireAuth blocked: ${req.method} ${req.originalUrl} (no valid session)`);
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(401).json({ success: false, error: 'Session expired. Please reload and log in again.' });
    }
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
  }
  next();
}

module.exports = { authenticate, requireAuth };
