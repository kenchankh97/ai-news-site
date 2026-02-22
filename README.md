# Your AI News

Automated AI news aggregator that fetches, summarizes, and translates the latest AI news twice daily — delivered to your inbox and readable in English, Traditional Chinese, and Simplified Chinese.

## Features

- **Twice-daily auto-fetch** at 08:00 and 18:00 HKT (up to 30 articles per update)
- **AI-powered summaries** in English, Traditional Chinese (繁中), and Simplified Chinese (简中)
- **4 news categories**: AI Business, AI Technology, AI Ethics, AI Research
- **Personalized email digest** sent after each update
- **Manual refresh** button (rate-limited to once per 30 minutes)
- **User registration** with email verification + password setup
- **Forgot/reset password** via email
- **Profile settings** — choose language and categories
- **Responsive design** — works on mobile and desktop
- **Dark theme** with professional news layout

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4 |
| Templates | EJS + express-ejs-layouts |
| CSS | Tailwind CSS v3 |
| Database | PostgreSQL (Railway.app) |
| News API | GNews.io (free: 100 req/day) |
| LLM | OpenRouter `qwen/qwen-2.5-72b-instruct:free` |
| Email | Brevo SMTP via Nodemailer (free: 300/day) |
| Auth | JWT (httpOnly cookies) + bcrypt |
| Scheduler | node-cron (HKT timezone) |

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (Railway.app recommended)
- [GNews.io](https://gnews.io) API key (free)
- [OpenRouter.ai](https://openrouter.ai) API key
- [Brevo](https://brevo.com) account (free SMTP)

### 1. Clone and install

```bash
git clone https://github.com/yourusername/your-ai-news.git
cd your-ai-news
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — 64-char random strings
- `SESSION_SECRET` — 32-char random string
- `GNEWS_API_KEY` — from gnews.io
- `OPENROUTER_API_KEY` — from openrouter.ai
- `BREVO_SMTP_USER` / `BREVO_SMTP_PASS` — from Brevo SMTP settings
- `EMAIL_FROM` — your verified sending email
- `APP_URL` — your app's public URL

Generate secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Initialize database

```bash
npm run db:init
```

### 4. Build CSS and start

```bash
npm run build:css
npm run dev       # development with auto-reload
npm start         # production
```

Visit `http://localhost:3000`

## Deployment to Railway.app

1. **Create Railway project** → Add PostgreSQL service
2. **Connect GitHub** repo — Railway auto-deploys on push to `main`
3. **Set environment variables** in Railway dashboard → Variables
4. **Initialize DB**: In Railway shell: `node scripts/initDb.js`
5. Railway auto-generates URL like `your-ai-news.up.railway.app`

## Service Setup

### GNews.io (News API)
- Sign up at [gnews.io](https://gnews.io)
- Free tier: 100 requests/day (this app uses ~6/day)
- Copy your API key to `GNEWS_API_KEY`

### OpenRouter.ai (LLM)
- Sign up at [openrouter.ai](https://openrouter.ai)
- Default free model: `qwen/qwen-2.5-72b-instruct:free`
- Excellent English + Chinese multilingual support

### Brevo (Email)
- Sign up at [brevo.com](https://brevo.com)
- Free tier: 300 emails/day, unlimited contacts
- Go to: **Settings → SMTP & API → Generate SMTP Key**
- Set `BREVO_SMTP_USER` = your login email
- Set `BREVO_SMTP_PASS` = the generated SMTP key (not your password)

## Project Structure

```
src/
├── app.js              Express app setup
├── server.js           HTTP server + cron scheduler
├── config/             Database pool, constants
├── middleware/         Auth, rate limiting, validation, errors
├── models/             Parameterized SQL (users, articles, sessions, prefs)
├── services/           GNews, LLM, email, news pipeline, JWT tokens
├── jobs/               node-cron scheduler (08:00 + 18:00 HKT)
├── routes/             Express routers
├── controllers/        Request handlers
├── views/              EJS templates + email HTML
└── public/             Static CSS, JS, images
```

## Security Features

- Helmet.js security headers
- Double-Submit Cookie CSRF protection (csrf-csrf)
- JWT in httpOnly + sameSite:strict cookies
- bcrypt password hashing (rounds=12)
- express-rate-limit on all auth and refresh endpoints
- express-validator + xss sanitization on all inputs
- Parameterized SQL queries (no injection risk)
- Refresh token rotation with session revocation

## License

© Ken Chan 2026. All rights reserved.
Powered by **Antigravity**
