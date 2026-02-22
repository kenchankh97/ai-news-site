'use strict';

const axios = require('axios');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'z-ai/glm-4.5-air:free';

const SYSTEM_PROMPT = `You are a multilingual AI news editor. You MUST produce output in THREE languages: English, Traditional Chinese (繁體中文), and Simplified Chinese (简体中文). All six fields below are REQUIRED — do not leave any field empty or null.

Return ONLY a valid JSON object with exactly these keys:
{
  "category": "one of: ai-business, ai-technology, ai-ethics, ai-research",
  "title_zh_tw": "繁體中文標題（必填）",
  "title_zh_cn": "简体中文标题（必填）",
  "summary_en": "3-4 sentence English summary covering the key facts, context, and significance of the article",
  "summary_zh_tw": "3至4句繁體中文摘要，涵蓋文章的重點事實、背景及重要性（必填）",
  "summary_zh_cn": "3至4句简体中文摘要，涵盖文章的重点事实、背景及重要性（必填）"
}

Category definitions:
- ai-business: AI company news, funding, acquisitions, enterprise AI, market analysis, AI products
- ai-technology: AI tools, models, frameworks, technical releases, product launches, engineering
- ai-ethics: AI safety, bias, regulation, policy, societal impact, privacy, governance
- ai-research: AI papers, academic research, benchmarks, scientific discoveries, datasets

IMPORTANT: Return ONLY the JSON object. No markdown fences, no explanation, no extra text. All Chinese fields are mandatory.`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Robust JSON parser: handles markdown fences, literal newlines inside strings,
// and unescaped characters that LLMs sometimes produce.
function parseJsonResponse(content) {
  // 1. Strip markdown code fences
  let text = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 2. Extract outermost {...} block
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) text = text.slice(start, end + 1);

  // 3. Direct parse
  try { return JSON.parse(text); } catch (_) {}

  // 4. Replace literal (unescaped) newlines — common when the model puts line
  //    breaks inside string values instead of using \n
  try { return JSON.parse(text.replace(/\r?\n/g, ' ')); } catch (_) {}

  // 5. Regex field-by-field extraction as last resort
  const result = {};
  const re = /"(category|title_zh_tw|title_zh_cn|summary_en|summary_zh_tw|summary_zh_cn)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    result[m[1]] = m[2].replace(/\\n/g, ' ').replace(/\\"/g, '"');
  }
  if (Object.keys(result).length >= 3) return result;

  console.warn('[LLM] Could not parse JSON from response:', text.substring(0, 300));
  return null;
}

// Free-tier OpenRouter models share a global rate limit.
// Process articles one-at-a-time with generous delays to avoid 429s.
const INTER_ARTICLE_DELAY_MS = 4000; // 4s between each article
const RETRY_DELAYS_MS = [30000, 60000]; // 30s then 60s on 429

async function processArticle(article, attempt = 1) {
  if (attempt === 1) console.log(`[LLM] Processing (model=${MODEL}): "${article.title_en.substring(0, 70)}"`);
  const userPrompt = `Title: ${article.title_en}\nContent: ${(article.raw_content || '').substring(0, 1500)}`;

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
          'X-Title': process.env.OPENROUTER_SITE_NAME || 'Your AI News',
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const content = response.data.choices[0].message.content.trim();
    const parsed = parseJsonResponse(content);
    if (parsed) {
      console.log(`[LLM] OK — category=${parsed.category} | zh_tw="${(parsed.title_zh_tw || '').substring(0, 30)}" | zh_cn="${(parsed.title_zh_cn || '').substring(0, 30)}"`);
    }
    return parsed;
  } catch (err) {
    const is429 = err.response?.status === 429;
    const errDetail = err.response
      ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data).substring(0, 200)}`
      : err.message;
    if (attempt <= RETRY_DELAYS_MS.length) {
      const delay = is429 ? RETRY_DELAYS_MS[attempt - 1] : attempt * 3000;
      console.warn(`[LLM] Attempt ${attempt} failed (${errDetail}), retrying in ${delay / 1000}s...`);
      await sleep(delay);
      return processArticle(article, attempt + 1);
    }
    console.error(`[LLM] Failed after ${attempt} attempts for "${article.title_en.substring(0, 50)}": ${errDetail}`);
    return null;
  }
}

async function processArticlesBatch(articles) {
  const results = [];
  // Sequential processing — one at a time to respect free-tier rate limits
  for (let i = 0; i < articles.length; i++) {
    const result = await processArticle(articles[i]);
    results.push(result);
    if (i < articles.length - 1) {
      await sleep(INTER_ARTICLE_DELAY_MS);
    }
  }
  return results;
}

module.exports = { processArticlesBatch };
