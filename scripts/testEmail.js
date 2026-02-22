'use strict';
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  }
});

async function test() {
  console.log('Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('SMTP connection: OK');
  } catch (e) {
    console.error('SMTP connection FAILED:', e.message);
    return;
  }

  console.log('\nSending test verification email to kenchankh@gmail.com ...');
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: 'kenchankh@gmail.com',
      subject: '[Test] Your AI News — Verify your account',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
          <h2 style="color:#6366f1;">Your AI News</h2>
          <p>This is a test verification email.</p>
          <p>If you received this, Brevo SMTP is working correctly!</p>
          <p><a href="http://localhost:3000/verify-email?token=TESTTOKEN123"
             style="background:#6366f1;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
            Verify Email (test link)
          </a></p>
          <p style="color:#666;font-size:12px;">Sent from: ${process.env.EMAIL_FROM}</p>
        </div>
      `
    });
    console.log('Email sent! Message ID:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
  } catch (e) {
    console.error('Send FAILED:', e.message);
    if (e.response) console.error('SMTP response:', e.response);
  }
}

test();
