'use strict';

const CATEGORIES = [
  { slug: 'ai-business',    label: 'AI Business',    labelZhTw: 'AI 商業',   labelZhCn: 'AI 商业',   emoji: '💼', colorClass: 'badge-business' },
  { slug: 'ai-technology',  label: 'AI Technology',  labelZhTw: 'AI 科技',   labelZhCn: 'AI 科技',   emoji: '⚡', colorClass: 'badge-technology' },
  { slug: 'ai-ethics',      label: 'AI Ethics',      labelZhTw: 'AI 倫理',   labelZhCn: 'AI 伦理',   emoji: '⚖️', colorClass: 'badge-ethics' },
  { slug: 'ai-research',    label: 'AI Research',    labelZhTw: 'AI 研究',   labelZhCn: 'AI 研究',   emoji: '🔬', colorClass: 'badge-research' }
];

const CATEGORY_SLUGS = CATEGORIES.map(c => c.slug);

const LANGUAGES = [
  { code: 'en',    label: 'English',  labelNative: 'EN' },
  { code: 'zh-TW', label: 'Traditional Chinese', labelNative: '繁中' },
  { code: 'zh-CN', label: 'Simplified Chinese',  labelNative: '简中' }
];

const LANGUAGE_CODES = LANGUAGES.map(l => l.code);

module.exports = { CATEGORIES, CATEGORY_SLUGS, LANGUAGES, LANGUAGE_CODES };
