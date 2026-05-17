# PromptVault Pro

**Save, organize, refine, and paste AI prompts — everywhere you work.**

PromptVault Pro is a three-surface productivity platform for power users of AI tools. A Chrome Extension sits directly inside ChatGPT, Claude, Gemini, and five other platforms; a FastAPI backend handles sync, AI refinement, and analytics; and a React web dashboard gives you a full prompt library, version history, and usage insights — all working offline-first.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development (Docker)](#local-development-docker)
  - [Running Each Surface Separately](#running-each-surface-separately)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [AI Refinement Engine](#ai-refinement-engine)
- [Supported Platforms](#supported-platforms)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Chrome Extension
- One-click prompt saving from any AI platform
- Real-time search with `<50 ms` debounce (offline, client-side)
- One-click paste into ChatGPT, Claude, Gemini, Perplexity, Grok, and Copilot
- `{{variable}}` template substitution with an in-popup modal
- Floating action button injected into every supported AI page
- `Ctrl+Shift+P` global keyboard shortcut
- Full offline support via IndexedDB + Chrome Storage, synced in the background via a MV3 service worker

### Web Dashboard
- Full prompt library: create, edit, tag, categorize, favorite, bulk import/export (JSON/CSV)
- Version history (last 5 versions per prompt) with diff viewer
- AI refinement panel: style selector (Professional / Creative / Technical / Concise), side-by-side diff, quality score
- Usage history: paginated table with date filters and re-use / pin-to-library actions
- Analytics dashboard: top prompts, platform breakdown, active hours (Recharts)
- Marketplace: browse, review, and share prompts with the community
- Creator earnings dashboard
- Dark / Light / Auto theme (respects `prefers-color-scheme`)
- Lazy-loaded routes, fully accessible (WCAG 2.1 AA, skip links, `aria-label` on nav)

### Backend
- JWT auth (15 min access token + 30 day rotating refresh in HttpOnly cookie)
- Google OAuth2 sign-in
- Full-text prompt search via PostgreSQL `to_tsvector` GIN index
- Redis sliding-window rate limiting (100 req/min API, 20 req/min AI)
- Prompt versioning, usage history, GDPR-compliant account deletion
- AI fallback chain: OpenRouter → Groq → Ollama → rule-based heuristics
- Heuristic quality scoring (0–100) with no AI call required

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SURFACES                            │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Chrome Extension │  │  React Web App   │                    │
│  │  (Popup + Content │  │  (Dashboard PWA) │                    │
│  │   Script + SW)    │  │                  │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
└───────────┼─────────────────────┼──────────────────────────────┘
            │  HTTPS REST / JWT   │
┌───────────▼─────────────────────▼──────────────────────────────┐
│                     FastAPI Backend (v1)                        │
│  Auth │ Prompts │ AI Refinement │ History │ Analytics │ Billing │
└──────┬──────────────────────┬─────────────────────────────── ──┘
       │                      │
  ┌────▼────┐           ┌─────▼──────┐     ┌──────────────────┐
  │PostgreSQL│           │   Redis    │     │ AI Engine Layer  │
  │   (ORM) │           │(Cache/Rate)│     │ OpenRouter/Groq  │
  └─────────┘           └────────────┘     │ /Ollama (Gemma3) │
                                           └──────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Chrome Extension | Vanilla JS, MV3, IndexedDB, `@crxjs/vite-plugin` |
| Web Frontend | React 18, TypeScript, Tailwind CSS, Vite, Zustand, Recharts, Headless UI |
| Backend | FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2 |
| Database | PostgreSQL 15 |
| Cache / Rate Limiting | Redis 7 |
| AI Models | Gemma 3 via OpenRouter, Groq (fallback), Ollama (local fallback) |
| Auth | JWT (python-jose), bcrypt (passlib), Google OAuth2 |
| Infrastructure | Docker, Nginx, GitHub Actions CI |
| Deploy targets | Railway (backend), Vercel (web), Chrome Web Store (extension) |

---

## Project Structure

```
promptvault-pro/
├── extension/                  # Chrome Extension (MV3, Vanilla JS)
│   ├── popup/                  # 420×600 popup UI
│   ├── content_scripts/        # Platform-specific paste engines
│   │   └── platforms/          # chatgpt.js, claude.js, gemini.js, …
│   ├── background/             # Service worker — offline sync queue
│   ├── storage/                # Chrome Storage + IndexedDB wrapper
│   └── vite.config.js
│
├── backend/                    # FastAPI REST API
│   ├── app/
│   │   ├── main.py             # App init, CORS, middleware
│   │   ├── config.py           # pydantic-settings config
│   │   ├── database.py         # Async SQLAlchemy engine
│   │   ├── routers/            # auth, prompts, ai, history, analytics, billing
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic v2 request/response schemas
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # JWT auth, Redis rate limiter
│   │   └── utils/              # quality_scorer, variable_parser, platform_detect
│   ├── alembic/                # Database migrations
│   ├── Dockerfile
│   └── alembic.ini
│
├── web/                        # React Web Dashboard
│   └── src/
│       ├── api/                # Axios client with JWT refresh interceptor
│       ├── features/           # auth, library, refiner, history, analytics, settings
│       ├── components/         # Shared UI (Button, Modal, Toast, SkipLink)
│       ├── hooks/              # usePrompts, useAuth, useTheme
│       └── store/              # Zustand global state
│
├── nginx/nginx.conf            # Reverse proxy + TLS termination
├── docker-compose.yml          # Full local stack
├── .env.example
└── .github/workflows/ci.yml    # Lint → test → build pipeline
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- Or locally: **Python 3.11+**, **Node.js 20+**, **PostgreSQL 15**, **Redis 7**

### Local Development (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/promptvault-pro.git
cd promptvault-pro

# 2. Create your environment file
cp .env.example .env
# Edit .env — add your OPENROUTER_API_KEY, GROQ_API_KEY, and Google OAuth credentials

# 3. Start the full stack
docker compose up --build

# Services will be available at:
#   Backend API  →  http://localhost:8000
#   Web Dashboard →  http://localhost:5173
#   API Docs      →  http://localhost:8000/docs
```

### Running Each Surface Separately

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Web Dashboard**
```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run type-check # TypeScript check (0 errors)
```

**Chrome Extension**
```bash
cd extension
npm install
npm run dev        # watch mode — rebuilds on change
npm run build      # production build → dist/
# Load the dist/ folder as an unpacked extension in chrome://extensions
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host:5432/promptvault` |
| `REDIS_URL` | Yes | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | 256-bit random secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | 256-bit random secret for refresh tokens |
| `OPENROUTER_API_KEY` | No* | Primary AI provider (Gemma 3 via OpenRouter) |
| `GROQ_API_KEY` | No* | Fallback AI provider |
| `GOOGLE_CLIENT_ID` | No | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth2 client secret |
| `FRONTEND_URL` | Yes | Web app origin for CORS (e.g. `http://localhost:5173`) |
| `BACKEND_URL` | Yes | Backend origin used by the web app |

*AI refinement falls back to rule-based heuristics if no API keys are set.

---

## API Overview

Interactive docs are auto-generated at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

| Group | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/google` |
| Prompts | `GET/POST /prompts`, `GET/PUT/DELETE /prompts/{id}`, `POST /prompts/{id}/duplicate`, `GET /prompts/{id}/versions` |
| AI | `POST /ai/refine`, `POST /ai/score`, `POST /ai/suggest-tags`, `POST /ai/feedback` |
| History | `GET /history`, `POST /history`, `DELETE /history` |
| Analytics | `GET /analytics/summary`, `GET /analytics/charts` |
| Billing | `POST /billing/create-checkout`, `POST /billing/webhook` |

All authenticated endpoints expect `Authorization: Bearer <access_token>`.

---

## AI Refinement Engine

Refinement requests travel down a four-step fallback chain, so the feature always returns a result:

```
1. OpenRouter  →  Gemma 3 (cloud, free tier, 8s timeout)
2. Groq        →  Gemma 3 8B (faster free tier, 5s timeout)
3. Ollama      →  local model, if user configured endpoint (15s timeout)
4. Heuristics  →  rule-based rewrite, always available, no network needed
```

**Quality Scoring** runs locally on every prompt with no AI call:

| Criterion | Weight |
|---|---|
| Specificity (concrete nouns, numbers) | 25% |
| Context (background clauses) | 20% |
| Clarity (absence of vague words) | 20% |
| Instruction completeness (action verb + output format) | 20% |
| Length fit (20–2000 chars) | 15% |

---

## Supported Platforms

The extension injects a one-click paste button directly into the input area of:

| Platform | Injection Method |
|---|---|
| ChatGPT | `#prompt-textarea` via React synthetic event |
| Claude | `div[contenteditable]` via `InputEvent` |
| Gemini | Quill editor (`.ql-editor`) |
| Perplexity | `textarea.overflow-auto` |
| Grok | `textarea[placeholder]` |
| Microsoft Copilot | `#searchbox` |

---

## Deployment

### Production Stack

| Service | Host |
|---|---|
| FastAPI backend | [Railway.app](https://railway.app) (Docker, auto-deploy from `main`) |
| React web app | [Vercel](https://vercel.com) (edge CDN, auto-deploy from `main`) |
| PostgreSQL | Supabase (free 500 MB) → Railway Postgres on growth |
| Redis | Upstash (free 10k req/day) → upgrade on growth |
| DNS + DDoS | Cloudflare (free tier) |
| Chrome Extension | Chrome Web Store |

### CI/CD

GitHub Actions runs on every push and PR to `main`:

1. Spin up Postgres 15 + Redis 7 service containers
2. Run Alembic migrations against the test database
3. Execute the pytest suite with coverage reporting
4. Verify FastAPI app import (import smoke test)

---

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| 0 — Project Setup | Done | Monorepo, Docker, CI, migrations |
| 1 — Chrome Extension Core | Done | Popup, offline storage, FAB, keyboard shortcut |
| 2 — FastAPI Backend | Done | Auth, CRUD, search, rate limiting |
| 3 — AI Refinement Engine | Done | Fallback chain, quality scorer, diff view |
| 4 — One-Click Paste Engine | Done | Platform content scripts, `{{variable}}` templates |
| 5 — React Web Dashboard | Done | Full library, analytics, marketplace, creator earnings |
| 6 — QA & Polish | Done | TypeScript clean, lazy routes, a11y, dark mode CSS |
| **7 — Launch** | **Next** | Chrome Web Store, Railway deploy, landing page, Product Hunt |
| 8 — Post-Launch | Planned | Edge browser, Bengali UI, batch AI refine, public sharing |
| 9 — Subscription Layer | Future | Stripe billing, Pro/Enterprise tiers, team libraries |

---

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Follow the existing code style — no comments unless the *why* is non-obvious.
3. Write or update tests for any backend changes (target >70% coverage).
4. Run `npm run type-check` in `web/` before opening a PR — zero TypeScript errors required.
5. Open a pull request against `main` with a clear description of what changed and why.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

> Built with FastAPI, React 18, and a Chrome Extension that knows its way around every major AI tool.
