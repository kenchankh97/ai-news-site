'use strict';

const axios = require('axios');

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_MODEL || 'qwen/qwen-2.5-72b-instruct:free';

const SYSTEM_PROMPT = `You are an AI news editor. Analyze the given article and return ONLY a valid JSON object with these exact keys:
{
  "category": one of ["ai-business","ai-technology","ai-ethics","ai-research"],
  "title_zh_tw": "Traditional Chinese (繁體中文) translation of the title",
  "title_zh_cn": "Simplified Chinese (简体中文) translation of the title",
  "summary_en": "2-3 sentence English summary of the article",
  "summary_zh_tw": "2-3 sentence Traditional Chinese (繁體中文) summary",
  "summary_zh_cn": "2-3 sentence Simplified Chinese (简体中文) summary"
}

Category definitions:
- ai-business: AI company news, funding, acquisitions, enterprise AI, market analysis, AI products
- ai-technology: AI tools, models, frameworks, technical releases, product launches, engineering
- ai-ethics: AI safety, bias, regulation, policy, societal impact, privacy, governance
- ai-research: AI papers, academic research, benchmarks, scientific discoveries, datasets

Return ONLY the JSON object, no markdown, no explanation, no extra text.`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processArticle(article, attempt = 1) {
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
        max_tokens: 700,
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
          'X-Title': process.env.OPENROUTER_SITE_NAME || 'Your AI News',
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    const content = response.data.choices[0].message.content.trim();

    // Strip markdown code fences if model adds them
    const clean = content.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    if (attempt < 3) {
      await sleep(attempt * 2000); // Exponential backoff: 2s, 4s
      return processArticle(article, attempt + 1);
    }
    console.error(`[LLM] Failed after 3 attempts for: ${article.title_en}`, err.message);
    return null;
  }
}

async function processArticlesBatch(articles) {
  const results = new Array(articles.length).fill(null);
  const CONCURRENCY = 3;

  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const chunk = articles.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(a => processArticle(a)));
    chunkResults.forEach((r, j) => { results[i + j] = r; });
    if (i + CONCURRENCY < articles.length) {
      await sleep(1500); // Gap between concurrent chunks
    }
  }

  return results;
}

module.exports = { processArticlesBatch };
