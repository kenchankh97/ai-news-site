'use strict';
require('dotenv').config();
const db = require('../src/config/database');
const emailService = require('../src/services/emailService');

async function run() {
  const result = await db.query(
    `SELECT id, email, display_name, verify_token, verify_token_expires, is_verified
     FROM users WHERE email = 'kenchankh@gmail.com'`
  );

  if (result.rows.length === 0) {
    console.log('User kenchankh@gmail.com NOT found in database.');
    console.log('Registration may have failed — please try registering again at http://localhost:3000/register');
    await db.end();
    return;
  }

  const user = result.rows[0];
  console.log('User found:', user.email);
  console.log('Verified:', user.is_verified);
  console.log('Has verify token:', !!user.verify_token);
  console.log('Token expires:', user.verify_token_expires);

  if (user.is_verified) {
    console.log('\nAccount is already verified! Go to http://localhost:3000/login');
    await db.end();
    return;
  }

  if (!user.verify_token) {
    console.log('\nNo verify token found. Please register again.');
    await db.end();
    return;
  }

  console.log('\nResending verification email...');
  await emailService.sendVerificationEmail(user, user.verify_token);
  console.log('Verification email resent to', user.email);
  console.log('Check spam/junk folder if not in inbox!');

  await db.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
