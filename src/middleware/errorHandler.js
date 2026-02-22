'use strict';

// 404 handler
function notFound(req, res, next) {
  const err = new Error('Page not found');
  err.status = 404;
  next(err);
}

// Global error handler
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Something went wrong. Please try again.';

  // CSRF token errors (csrf-csrf: INVALID_CSRF_TOKEN)
  if (err.code === 'EBADCSRFTOKEN' || err.code === 'INVALID_CSRF_TOKEN') {
    if (req.accepts('json')) {
      return res.status(403).json({ success: false, error: 'Invalid CSRF token.' });
    }
    req.flash('error', 'Your session expired. Please try again.');
    return res.redirect(req.headers.referer || '/');
  }

  // Log server errors
  if (status >= 500) {
    console.error(`[Error] ${req.method} ${req.path}:`, err);
  }

  // API requests get JSON errors
  if (req.path.startsWith('/api/') || req.accepts('json') === 'json') {
    return res.status(status).json({ success: false, error: message });
  }

  // HTML pages get rendered error
  res.status(status).render('pages/error', {
    pageTitle: `${status} Error`,
    statusCode: status,
    message
  });
}

module.exports = { notFound, errorHandler };
