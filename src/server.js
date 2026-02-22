'use strict';

require('dotenv').config();

const app = require('./app');
const { startScheduler } = require('./jobs/newsScheduler');
const db = require('./config/database');
const sessionModel = require('./models/sessionModel');

const PORT = process.env.PORT || 3000;

async function start() {
  // Verify DB connection
  try {
    await db.query('SELECT 1');
    console.log('[Server] Database connection OK');
  } catch (err) {
    console.error('[Server] Database connection failed:', err.message);
    console.error('[Server] Ensure DATABASE_URL is set and database is reachable.');
    process.exit(1);
  }

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`[Server] Your AI News running at http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Start cron scheduler
  if (process.env.NODE_ENV !== 'test') {
    startScheduler();
  }

  // Clean expired sessions daily
  setInterval(async () => {
    try {
      const count = await sessionModel.cleanExpired();
      if (count > 0) console.log(`[Server] Cleaned ${count} expired sessions`);
    } catch (err) {
      console.error('[Server] Session cleanup error:', err.message);
    }
  }, 24 * 60 * 60 * 1000);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received. Shutting down gracefully...');
    server.close(async () => {
      await db.end();
      console.log('[Server] Closed.');
      process.exit(0);
    });
  });
}

start().catch(err => {
  console.error('[Server] Startup failed:', err);
  process.exit(1);
});
