'use strict';

const { body, validationResult } = require('express-validator');
const xss = require('xss');

// Helper: extract errors and redirect back with flash message
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    req.flash('error', messages.join(' '));
    return res.redirect('back');
  }
  next();
}

// Helper: API response for validation errors
function handleApiValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(e => e.msg)
    });
  }
  next();
}

const validateRegister = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email is too long.'),
  body('display_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be 2–100 characters.')
    .customSanitizer(val => xss(val)),
  handleValidationErrors
];

const validateSetupPassword = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain at least one special character.'),
  body('confirm_password')
    .custom((val, { req }) => val === req.body.password)
    .withMessage('Passwords do not match.'),
  handleValidationErrors
];

const validateLogin = [
  body('email').trim().isEmail().withMessage('Invalid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
  handleValidationErrors
];

const validateForgotPassword = [
  body('email').trim().isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
  handleValidationErrors
];

const validateResetPassword = [
  body('token').notEmpty().withMessage('Invalid reset token.').trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain at least one special character.'),
  body('confirm_password')
    .custom((val, { req }) => val === req.body.password)
    .withMessage('Passwords do not match.'),
  handleValidationErrors
];

const validateProfileUpdate = [
  body('display_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Display name must be 2–100 characters.')
    .customSanitizer(val => xss(val)),
  body('language')
    .isIn(['en', 'zh-TW', 'zh-CN'])
    .withMessage('Invalid language selection.'),
  body('categories')
    .customSanitizer(val => {
      const valid = ['ai-business', 'ai-technology', 'ai-ethics', 'ai-research'];
      if (!val) return [];
      const arr = Array.isArray(val) ? val : [val];
      return arr.filter(c => valid.includes(c));
    }),
  body('email_digest').customSanitizer(val => val === 'true' || val === true || val === '1' || val === 'on'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateSetupPassword,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateProfileUpdate,
  handleApiValidationErrors
};
