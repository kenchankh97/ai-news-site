'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const { doubleCsrf } = require('csrf-csrf');

const { globalLimiter } = require('./middleware/rateLimiter');
const { authenticate } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { CATEGORIES } = require('./config/constants');

const app = express();

// ---- Security headers ----
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Needed for inline Tailwind-processed styles
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Trust Railway's reverse proxy
app.set('trust proxy', 1);

// ---- Body parsers ----
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ---- Cookie parser ----
app.use(cookieParser(process.env.SESSION_SECRET));

// ---- Session (for CSRF and flash messages) ----
app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000 // 1 hour for flash messages
  }
}));

// ---- Flash messages ----
app.use(flash());

// ---- Global rate limiting ----
app.use(globalLimiter);

// ---- Static files ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- View engine ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// ---- Health check (before CSRF — no token needed) ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

// ---- CSRF protection (Double Submit Cookie pattern) ----
// csrf-csrf is a maintained, modern CSRF library for Express.
// Token is read from req.body._csrf or the 'x-csrf-token' header.
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || 'dev-secret',
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  },
  size: 64,
  getTokenFromRequest: (req) =>
    req.body?._csrf || req.headers['x-csrf-token'] || req.headers['csrf-token']
});

// Apply CSRF validation only to state-changing methods (POST, PUT, PATCH, DELETE)
// Skip for GET /health (already registered above)
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  doubleCsrfProtection(req, res, next);
});

// ---- JWT Auth middleware ----
app.use(authenticate);

// ---- Global template locals ----
app.use((req, res, next) => {
  res.locals.user         = req.user || null;
  res.locals.csrfToken    = generateToken(req, res);
  res.locals.flashSuccess = req.flash('success');
  res.locals.flashError   = req.flash('error');
  res.locals.currentPath  = req.path;
  res.locals.categories   = CATEGORIES;
  next();
});

// ---- Routes ----
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/about', require('./routes/about'));
app.use('/api/news', require('./routes/news'));

// ---- Error handlers ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
