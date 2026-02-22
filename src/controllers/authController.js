'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const sessionModel = require('../models/sessionModel');
const preferenceModel = require('../models/preferenceModel');
const tokenService = require('../services/tokenService');
const emailService = require('../services/emailService');

const BCRYPT_ROUNDS = 12;

// Generate a secure random hex token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ---- Register ----
async function register(req, res) {
  const { email, display_name } = req.body;

  try {
    const existing = await userModel.findByEmail(email);
    if (existing) {
      if (!existing.is_verified) {
        // Account exists but email not verified — send them to resend page
        return res.redirect(`/resend-verification?email=${encodeURIComponent(email)}`);
      }
      req.flash('error', 'An account with this email already exists. Please sign in.');
      return res.redirect('/login');
    }

    const verifyToken = generateToken();
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await userModel.create({
      email,
      displayName: display_name,
      verifyToken,
      verifyTokenExpires: verifyExpires
    });

    await emailService.sendVerificationEmail(user, verifyToken);

    req.flash('success', 'Account created! Please check your email to verify your account.');
    res.redirect('/login');
  } catch (err) {
    console.error('[Auth] Register error:', err);
    req.flash('error', 'Registration failed. Please try again.');
    res.redirect('/register');
  }
}

// ---- Verify Email (GET) — show confirmation page; does NOT verify yet ----
// Email security scanners (Microsoft Defender, etc.) auto-follow GET links.
// Actual verification only happens on the POST below (scanners don't POST forms).
async function verifyEmail(req, res) {
  const { token, uid } = req.query;

  if (!token && !uid) {
    req.flash('error', 'Invalid verification link.');
    return res.redirect('/register');
  }

  try {
    // Check if the token is still valid
    const user = token ? await userModel.findByVerifyToken(token) : null;

    if (user) {
      // Token valid — show confirmation page; user must click a button to complete
      return res.render('pages/verify-email-confirm', {
        pageTitle: 'Confirm Your Email',
        token,
        uid: user.id
      });
    }

    // Token expired/consumed (possibly by email scanner).
    // If uid is known, check whether the account is already verified but has no password.
    if (uid) {
      const existing = await userModel.findByEmail(
        (await userModel.findById(uid))?.email || ''
      );
      if (existing && existing.is_verified && !existing.password_hash) {
        // Scanner verified the account — send user straight to set their password
        req.flash('info', 'Your email was already verified. Please set your password to complete sign-up.');
        return res.redirect(`/setup-password?uid=${uid}`);
      }
    }

    req.flash('error', 'This verification link has expired or already been used. Please request a new one.');
    return res.redirect('/resend-verification');
  } catch (err) {
    console.error('[Auth] Verify email error:', err);
    req.flash('error', 'Verification failed. Please try again.');
    res.redirect('/register');
  }
}

// ---- Confirm Email (POST) — actual verification triggered by button click ----
async function confirmVerifyEmail(req, res) {
  const { token, uid } = req.body;

  if (!token || !uid) {
    req.flash('error', 'Invalid verification request.');
    return res.redirect('/register');
  }

  try {
    const user = await userModel.findByVerifyToken(token);
    if (!user || user.id !== uid) {
      req.flash('error', 'This verification link has expired. Please request a new one.');
      return res.redirect('/resend-verification');
    }

    await userModel.verify(user.id);
    res.redirect(`/setup-password?uid=${user.id}`);
  } catch (err) {
    console.error('[Auth] Confirm verify email error:', err);
    req.flash('error', 'Verification failed. Please try again.');
    res.redirect('/register');
  }
}

// ---- Setup Password (after email verification) ----
async function setupPassword(req, res) {
  const { token, uid, password } = req.body;

  if (!uid) {
    req.flash('error', 'Invalid session. Please register again.');
    return res.redirect('/register');
  }

  try {
    const user = await userModel.findById(uid);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/register');
    }

    if (user.password_hash) {
      req.flash('error', 'Password already set. Please log in.');
      return res.redirect('/login');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await userModel.setPassword(uid, passwordHash);

    // Create default preferences
    await preferenceModel.createDefaults(uid);

    // Create session and issue JWT cookies
    const expiresAt = tokenService.refreshExpiresAt();
    const session = await sessionModel.create({ userId: uid, refreshToken: '__placeholder__', expiresAt });
    const accessToken = tokenService.signAccessToken(uid);
    const refreshToken = tokenService.signRefreshToken(uid, session.id);
    await sessionModel.updateToken(session.id, refreshToken, expiresAt);
    tokenService.setAuthCookies(res, accessToken, refreshToken);

    req.flash('success', 'Account setup complete! Welcome to Your AI News.');
    res.redirect('/profile');
  } catch (err) {
    console.error('[Auth] Setup password error:', err);
    req.flash('error', 'Failed to set password. Please try again.');
    res.redirect('back');
  }
}

// ---- Login ----
async function login(req, res) {
  const { email, password } = req.body;

  try {
    const user = await userModel.findByEmail(email);
    if (!user || !user.password_hash) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    if (!user.is_verified) {
      req.flash('error', 'Please verify your email before logging in.');
      return res.redirect('/login');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/login');
    }

    // Create session
    const expiresAt = tokenService.refreshExpiresAt();
    const session = await sessionModel.create({ userId: user.id, refreshToken: '__placeholder__', expiresAt });
    const accessToken = tokenService.signAccessToken(user.id);
    const refreshToken = tokenService.signRefreshToken(user.id, session.id);
    await sessionModel.updateToken(session.id, refreshToken, expiresAt);
    tokenService.setAuthCookies(res, accessToken, refreshToken);

    res.redirect('/');
  } catch (err) {
    console.error('[Auth] Login error:', err);
    req.flash('error', 'Login failed. Please try again.');
    res.redirect('/login');
  }
}

// ---- Logout ----
async function logout(req, res) {
  const refreshToken = req.cookies && req.cookies['refresh_token'];
  if (refreshToken) {
    try { await sessionModel.deleteByToken(refreshToken); } catch (_) {}
  }
  tokenService.clearAuthCookies(res);
  req.flash('success', 'You have been logged out.');
  res.redirect('/login');
}

// ---- Forgot Password ----
async function forgotPassword(req, res) {
  const { email } = req.body;
  // Always respond the same way to avoid email enumeration
  const SAFE_RESPONSE = 'If an account with that email exists, a reset link has been sent.';

  try {
    const user = await userModel.findByEmail(email);
    if (user && user.is_verified) {
      const resetToken = generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await userModel.setResetToken(user.id, resetToken, resetExpires);
      await emailService.sendPasswordResetEmail(user, resetToken).catch(() => {});
    }
  } catch (err) {
    console.error('[Auth] Forgot password error:', err);
  }

  req.flash('success', SAFE_RESPONSE);
  res.redirect('/forgot-password');
}

// ---- Reset Password ----
async function resetPassword(req, res) {
  const { token, password } = req.body;

  try {
    const user = await userModel.findByResetToken(token);
    if (!user) {
      req.flash('error', 'This reset link is invalid or has expired.');
      return res.redirect(`/reset-password?token=${token}`);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await userModel.resetPassword(user.id, passwordHash);

    // Invalidate all existing sessions
    await sessionModel.deleteAllForUser(user.id);
    tokenService.clearAuthCookies(res);

    req.flash('success', 'Password reset successfully. Please log in with your new password.');
    res.redirect('/login');
  } catch (err) {
    console.error('[Auth] Reset password error:', err);
    req.flash('error', 'Password reset failed. Please try again.');
    res.redirect('back');
  }
}

// ---- Resend Verification Email ----
async function resendVerification(req, res) {
  const { email } = req.body;
  // Same safe response regardless of outcome — avoids email enumeration
  const SAFE_MSG = 'If your account is pending verification, a new link has been sent. Please check your inbox.';

  try {
    const user = await userModel.findByEmail(email);
    if (user && !user.is_verified) {
      const verifyToken = generateToken();
      const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await userModel.setVerifyToken(user.id, verifyToken, verifyExpires);
      await emailService.sendVerificationEmail(user, verifyToken).catch(err => {
        console.error('[Auth] Resend verification email failed:', err.message);
      });
    }
  } catch (err) {
    console.error('[Auth] Resend verification error:', err);
  }

  req.flash('success', SAFE_MSG);
  res.redirect('/login');
}

module.exports = { register, verifyEmail, confirmVerifyEmail, setupPassword, login, logout, forgotPassword, resetPassword, resendVerification };
