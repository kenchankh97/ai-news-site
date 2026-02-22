'use strict';

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Brevo SMTP transport
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS
  }
});

const FROM = `"${process.env.EMAIL_FROM_NAME || 'Your AI News'}" <${process.env.EMAIL_FROM || 'noreply@example.com'}>`;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Load and cache email templates
const templateCache = {};
function loadTemplate(name) {
  if (!templateCache[name]) {
    const filePath = path.join(__dirname, '..', 'views', 'emails', `${name}.html`);
    templateCache[name] = fs.readFileSync(filePath, 'utf8');
  }
  return templateCache[name];
}

function renderTemplate(name, vars) {
  let html = loadTemplate(name);
  for (const [key, val] of Object.entries(vars)) {
    html = html.split(`{{${key}}}`).join(val || '');
  }
  return html;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Transactional emails ----

async function sendVerificationEmail(user, verifyToken) {
  const verifyUrl = `${APP_URL}/verify-email?token=${verifyToken}`;
  const html = renderTemplate('verify', {
    DISPLAY_NAME: user.display_name || user.email,
    VERIFY_URL: verifyUrl,
    APP_URL
  });

  await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: 'Verify your Your AI News account',
    html
  });
}

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  const html = renderTemplate('resetPassword', {
    DISPLAY_NAME: user.display_name || user.email,
    RESET_URL: resetUrl,
    APP_URL
  });

  await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: 'Reset your Your AI News password',
    html
  });
}

// ---- Digest email ----

const CATEGORY_LABELS = {
  'ai-business':   { en: 'AI Business',    zhTw: 'AI 商業',  zhCn: 'AI 商业'  },
  'ai-technology': { en: 'AI Technology',  zhTw: 'AI 科技',  zhCn: 'AI 科技'  },
  'ai-ethics':     { en: 'AI Ethics',      zhTw: 'AI 倫理',  zhCn: 'AI 伦理'  },
  'ai-research':   { en: 'AI Research',    zhTw: 'AI 研究',  zhCn: 'AI 研究'  }
};

function getCategoryLabel(slug, lang) {
  const labels = CATEGORY_LABELS[slug] || { en: slug, zhTw: slug, zhCn: slug };
  if (lang === 'zh-TW') return labels.zhTw;
  if (lang === 'zh-CN') return labels.zhCn;
  return labels.en;
}

function getTitle(article, lang) {
  if (lang === 'zh-TW' && article.title_zh_tw) return article.title_zh_tw;
  if (lang === 'zh-CN' && article.title_zh_cn) return article.title_zh_cn;
  return article.title_en;
}

function getSummary(article, lang) {
  if (lang === 'zh-TW' && article.summary_zh_tw) return article.summary_zh_tw;
  if (lang === 'zh-CN' && article.summary_zh_cn) return article.summary_zh_cn;
  return article.summary_en || '';
}

function buildCategorySections(articles, subscriberCategories, lang) {
  const byCategory = {};
  for (const cat of subscriberCategories) {
    byCategory[cat] = articles.filter(a => a.category === cat);
  }

  let html = '';
  for (const [cat, catArticles] of Object.entries(byCategory)) {
    if (!catArticles.length) continue;
    const catLabel = getCategoryLabel(cat, lang);
    let articlesHtml = '';
    for (const art of catArticles.slice(0, 5)) {
      const title = getTitle(art, lang);
      const summary = getSummary(art, lang);
      const source = art.source_name || '';
      const url = art.source_url || art.gnews_url || '#';
      articlesHtml += `
        <div style="background:#1e293b;border-radius:8px;padding:16px;margin-bottom:12px;">
          <div style="font-size:15px;font-weight:600;color:#f1f5f9;line-height:1.4;margin-bottom:8px;">
            <a href="${url}" style="color:#f1f5f9;text-decoration:none;">${escHtml(title)}</a>
          </div>
          ${summary ? `<div style="font-size:13px;color:#94a3b8;line-height:1.6;margin-bottom:10px;">${escHtml(summary)}</div>` : ''}
          ${source ? `<div style="font-size:11px;color:#64748b;">${escHtml(source)}</div>` : ''}
          <a href="${url}" style="display:inline-block;margin-top:8px;color:#6366f1;font-size:12px;text-decoration:none;">Read full article →</a>
        </div>`;
    }

    html += `
      <div style="margin:24px 0;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#6366f1;border-bottom:1px solid #1e293b;padding-bottom:8px;margin-bottom:16px;">
          ${escHtml(catLabel)}
        </div>
        ${articlesHtml}
      </div>`;
  }
  return html;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendPersonalizedDigest(subscriber, articles, batchId) {
  const lang = subscriber.language || 'en';
  const cats = subscriber.categories || ['ai-business', 'ai-technology', 'ai-ethics', 'ai-research'];

  // Build batch metadata
  const [datePart, hourPart] = [batchId.slice(0, 10), batchId.slice(11)];
  const hour = parseInt(hourPart);
  const edition = hour < 12 ? 'Morning' : 'Evening';
  const dateStr = new Date(datePart + 'T00:00:00+08:00')
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const categorySections = buildCategorySections(articles, cats, lang);
  if (!categorySections.trim()) return; // Nothing to send

  const html = renderTemplate('digest', {
    DISPLAY_NAME: subscriber.display_name || subscriber.email,
    EDITION: edition,
    DATE_FORMATTED: dateStr,
    CATEGORY_SECTIONS: categorySections,
    APP_URL,
    UNSUB_TOKEN: '' // users manage via profile page
  });

  const subject = lang === 'zh-TW'
    ? `您的 AI 新聞 — ${edition === 'Morning' ? '早間' : '晚間'}版 ${dateStr}`
    : lang === 'zh-CN'
    ? `您的 AI 新闻 — ${edition === 'Morning' ? '早间' : '晚间'}版 ${dateStr}`
    : `Your AI News — ${edition} Edition, ${dateStr}`;

  await transporter.sendMail({ from: FROM, to: subscriber.email, subject, html });
}

async function sendDigestToAllSubscribers(batchId, articles) {
  const preferenceModel = require('../models/preferenceModel');
  const subscribers = await preferenceModel.getDigestSubscribers();

  if (!subscribers.length) return;

  // Send in batches of 50 to avoid SMTP rate limits
  for (let i = 0; i < subscribers.length; i += 50) {
    const chunk = subscribers.slice(i, i + 50);
    await Promise.all(
      chunk.map(sub =>
        sendPersonalizedDigest(sub, articles, batchId).catch(err =>
          console.error(`[Email] Failed digest for ${sub.email}:`, err.message)
        )
      )
    );
    if (i + 50 < subscribers.length) await sleep(1000);
  }

  console.log(`[Email] Sent digest for batch ${batchId} to ${subscribers.length} subscribers`);
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendDigestToAllSubscribers
};
