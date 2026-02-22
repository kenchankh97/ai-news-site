'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function initDb() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running schema...');
    await client.query(schema);
    console.log('✅ Database initialized successfully!');

    client.release();
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
