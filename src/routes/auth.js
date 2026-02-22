'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const {
  validateRegister,
  validateSetupPassword,
  validateLogin,
  validateForgotPassword,
  validateResetPassword
} = require('../middleware/validateInput');

// Register
router.get('/register', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('pages/register', { pageTitle: 'Create Account' });
});
router.post('/register', authLimiter, validateRegister, authController.register);

// Email verification
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-email', authController.confirmVerifyEmail);

// Password setup (after verification)
router.get('/setup-password', (req, res) => {
  const { token, uid } = req.query;
  if (!uid) return res.redirect('/register');
  res.render('pages/setup-password', { pageTitle: 'Set Your Password', token, uid });
});
router.post('/setup-password', validateSetupPassword, authController.setupPassword);

// Login
router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('pages/login', { pageTitle: 'Sign In' });
});
router.post('/login', authLimiter, validateLogin, authController.login);

// Logout
router.post('/logout', authController.logout);

// Resend verification email
router.get('/resend-verification', (req, res) => {
  const email = req.query.email || '';
  res.render('pages/resend-verification', { pageTitle: 'Resend Verification Email', prefillEmail: email });
});
router.post('/resend-verification', passwordResetLimiter, authController.resendVerification);

// Forgot password
router.get('/forgot-password', (req, res) => {
  res.render('pages/forgot-password', { pageTitle: 'Forgot Password' });
});
router.post('/forgot-password', passwordResetLimiter, validateForgotPassword, authController.forgotPassword);

// Reset password
router.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) {
    req.flash('error', 'Invalid reset link.');
    return res.redirect('/forgot-password');
  }
  res.render('pages/reset-password', { pageTitle: 'Reset Password', token });
});
router.post('/reset-password', validateResetPassword, authController.resetPassword);

module.exports = router;
