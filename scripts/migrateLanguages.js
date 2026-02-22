'use strict';
require('dotenv').config();
const db = require('../src/config/database');

async function migrate() {
  console.log('Migrating user_preferences: language VARCHAR → languages TEXT[]...');

  await db.query(`
    ALTER TABLE user_preferences
      ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT ARRAY['en']
  `);
  console.log('  Added languages column');

  await db.query(`
    UPDATE user_preferences
    SET languages = ARRAY[language]
    WHERE language IS NOT NULL AND array_length(languages, 1) = 1 AND languages[1] = 'en'
      AND language != 'en'
  `);
  console.log('  Migrated existing language values');

  // Check if language column still exists before dropping
  const col = await db.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'language'
  `);
  if (col.rows.length > 0) {
    await db.query(`ALTER TABLE user_preferences DROP COLUMN language`);
    console.log('  Dropped old language column');
  }

  console.log('Migration complete!');
  await db.end();
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
