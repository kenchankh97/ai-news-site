'use strict';
require('dotenv').config();
const db = require('../src/config/database');

async function clear() {
  const { rows } = await db.query('SELECT COUNT(*) FROM news_articles');
  console.log(`Deleting ${rows[0].count} articles...`);
  await db.query('DELETE FROM news_articles');
  console.log('Done. All articles cleared.');
  await db.end();
}

clear().catch(e => { console.error(e.message); process.exit(1); });
