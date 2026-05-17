# Prompt Base

**The prompt marketplace and AI refiner for serious AI users.**

Prompt Base is a web-based platform where you save, organize, refine, and share AI prompts. The core product is the web app — a full prompt library, an AI-powered refiner, and a community marketplace where creators publish and monetize their prompts. A companion Chrome Extension brings one-click paste directly into ChatGPT, Claude, Gemini, and other AI tools.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Screenshots / Surface Overview](#surface-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [AI Refiner — How It Works](#ai-refiner--how-it-works)
- [Marketplace Features](#marketplace-features)
- [Chrome Extension](#chrome-extension)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## What It Does

### Prompt Library
Your personal collection of prompts — create, tag, categorize, favorite, version, and search them all in one place. Every prompt gets a heuristic quality score (0–100) before you even touch the AI refiner. Bulk import from JSON/CSV; export any time.

### AI Refiner
Paste any prompt, pick a refinement style (Professional / Creative / Technical / Concise), and get an improved version in seconds. The refiner shows a side-by-side diff and before/after quality score rings so you can see exactly what changed and why. Refined prompts save directly to your library.

### Marketplace
A community catalog of prompts — browse by category, sort by newest / most forked / top rated, and import any prompt to your library in one click. Creators publish prompts (free or paid), collect star ratings, and track downloads. Prompts can be forked; the fork graph is tracked and shown in the detail view.

### Creator Earnings Dashboard
If you publish prompts on the marketplace, the earnings dashboard tracks your total revenue, monthly earnings, top-performing prompts, and payout history — all in one view.

### Usage Analytics
Recharts-powered dashboards show your most-used prompts, AI platform breakdown, active usage hours, and refinement activity over time.

---

## Surface Overview

| Surface | Role |
|---|---|
| **Web App** (React + TypeScript) | Primary product — library, refiner, marketplace, analytics, settings |
| **FastAPI Backend** | REST API — auth, prompt CRUD, AI refinement, marketplace, analytics, billing |
| **Chrome Extension** | Companion tool — one-click paste from your library into any AI platform |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web Frontend | React 18, TypeScript 5, Tailwind CSS 3, Vite 5, Zustand, Recharts, Headless UI, react-diff-viewer |
| Backend | FastAPI, SQLAlchemy 2.0 async, Alembic, Pydantic v2, Python 3.11 |
| Database | PostgreSQL 15 (full-text search via GIN index) |
| Cache / Rate Limiting | Redis 7 (sliding window, session tokens, search cache) |
| AI Models | Gemma 3 via OpenRouter → Groq fallback → Ollama (local) → rule-based heuristic |
| Auth | JWT (python-jose), bcrypt (passlib), Google OAuth2 |
| Chrome Extension | Vanilla JS, Manifest V3, IndexedDB, `@crxjs/vite-plugin` |
| Infrastructure | Docker Compose, Nginx, GitHub Actions CI |
| Deploy | Railway (backend), Vercel (web), Chrome Web Store (extension) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SURFACES                            │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  React Web App   │  │  Chrome Extension │                    │
│  │  (PRIMARY)       │  │  (companion)      │                    │
│  │  Library         │  │  paste engine     │                    │
│  │  Refiner         │  │  offline sync     │                    │
│  │  Marketplace     │  │                  │                    │
│  │  Analytics       │  │                  │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
└───────────┼─────────────────────┼──────────────────────────────┘
            │  HTTPS REST / JWT   │
┌───────────▼─────────────────────▼──────────────────────────────┐
│                     FastAPI Backend (v1)                        │
│  Auth │ Prompts │ AI Refinement │ Marketplace │ Analytics       │
└──────┬──────────────────────┬─────────────────────────────── ──┘
       │                      │
  ┌────▼────┐           ┌─────▼──────┐     ┌──────────────────┐
  │PostgreSQL│           │   Redis    │     │ AI Engine Layer  │
  │   (ORM) │           │(Cache/Rate)│     │ OpenRouter/Groq  │
  └─────────┘           └────────────┘     │ /Ollama (Gemma3) │
                                           └──────────────────┘
```

### Request Lifecycle
```
Browser → Nginx (TLS termination) → Uvicorn (ASGI)
  → Auth Middleware (JWT decode → user_id in request.state)
  → Rate Limiter (Redis sliding window: 100/min API, 20/min AI)
  → Router → Service → SQLAlchemy ORM → PostgreSQL
  → Pydantic serialization → Response
```

---

## Project Structure

```
prompt-base/
│
├── web/                        # React Web App (primary product)
│   └── src/
│       ├── features/
│       │   ├── home/           # Dashboard overview, stats, quick actions
│       │   ├── library/        # Prompt list, editor, version history
│       │   ├── refiner/        # AI refiner, diff viewer, quality scores
│       │   ├── marketplace/    # Browse, filter, import, rate, fork prompts
│       │   ├── creators/       # Creator profile pages
│       │   ├── earnings/       # Creator revenue & payout dashboard
│       │   ├── analytics/      # Recharts usage dashboards
│       │   ├── history/        # Usage history table with filters
│       │   ├── settings/       # Theme, account, API keys, export
│       │   └── auth/           # Login, register, Google OAuth callback
│       ├── components/         # Button, Modal, Toast, Skeleton, EmptyState, …
│       ├── hooks/              # usePrompts, useAuth, useMarketplace, useEarnings
│       ├── store/              # Zustand (authStore, themeStore)
│       └── api/                # Axios client with JWT refresh interceptor
│
├── backend/                    # FastAPI REST API
│   └── app/
│       ├── routers/            # auth, prompts, ai, history, analytics, billing
│       ├── models/             # SQLAlchemy ORM: user, prompt, versions, history, refinement
│       ├── schemas/            # Pydantic v2 request/response schemas
│       ├── services/           # Business logic (auth, prompt, AI, billing)
│       ├── middleware/         # JWT auth, Redis rate limiter
│       └── utils/              # quality_scorer, variable_parser, platform_detect
│
├── extension/                  # Chrome Extension (companion)
│   ├── popup/                  # 420×600 popup UI (Vanilla JS)
│   ├── content_scripts/        # Platform-specific paste engines
│   │   └── platforms/          # chatgpt.js, claude.js, gemini.js, …
│   ├── background/             # MV3 service worker — offline sync queue
│   └── storage/                # Chrome Storage + IndexedDB wrapper
│
├── nginx/nginx.conf            # Reverse proxy + TLS
├── docker-compose.yml
├── .env.example
└── .github/workflows/ci.yml
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended), **or**
- Python 3.11+, Node.js 20+, PostgreSQL 15, Redis 7

### Quickstart with Docker

```bash
git clone https://github.com/shakilahamedriaz/prompt-base.git
cd prompt-base

cp .env.example .env
# Fill in your API keys (see Environment Variables below)

docker compose up --build
```

| Service | URL |
|---|---|
| Web Dashboard | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Interactive API Docs | http://localhost:8000/docs |

### Manual Setup

**Backend**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Web App**
```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm run build        # production build
npm run type-check   # must pass with 0 errors
```

**Chrome Extension**
```bash
cd extension
npm install
npm run dev          # watch mode, rebuilds on change
npm run build        # outputs to dist/
# In Chrome: go to chrome://extensions → Load unpacked → select dist/
```

---

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host:5432/promptvault` |
| `REDIS_URL` | Yes | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | 256-bit random string for access tokens |
| `JWT_REFRESH_SECRET` | Yes | 256-bit random string for refresh tokens |
| `OPENROUTER_API_KEY` | Optional* | Primary AI provider (Gemma 3 via OpenRouter) |
| `GROQ_API_KEY` | Optional* | Fallback AI provider |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth2 sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth2 sign-in |
| `FRONTEND_URL` | Yes | Web app origin for CORS (e.g. `http://localhost:5173`) |
| `BACKEND_URL` | Yes | Backend URL used by the web app |

*Without AI API keys, the refiner falls back to rule-based heuristics automatically.

---

## API Overview

Full interactive docs at `http://localhost:8000/docs`. All protected endpoints require `Authorization: Bearer <access_token>`.

| Group | Key Endpoints |
|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/google` |
| **Prompts** | `GET /prompts`, `POST /prompts`, `PUT /prompts/{id}`, `GET /prompts/{id}/versions` |
| **AI Refiner** | `POST /ai/refine`, `POST /ai/score`, `POST /ai/suggest-tags`, `POST /ai/feedback` |
| **Marketplace** | `GET /marketplace`, `POST /marketplace/{id}/fork`, `POST /marketplace/{id}/rate` |
| **History** | `GET /history`, `POST /history`, `DELETE /history` |
| **Analytics** | `GET /analytics/summary`, `GET /analytics/charts` |
| **Earnings** | `GET /earnings/summary`, `GET /earnings/payouts` |
| **Billing** | `POST /billing/create-checkout`, `POST /billing/webhook` |

---

## AI Refiner — How It Works

Every refinement request travels a four-step fallback chain, so the feature always returns a result:

```
1. OpenRouter  →  Gemma 3 (cloud, free tier)        8s timeout
2. Groq        →  Gemma 3 8B (faster free tier)     5s timeout
3. Ollama      →  local model (user-configured)     15s timeout
4. Heuristics  →  rule-based rewrite                always available
```

**Quality Scoring** runs locally on every prompt — no AI call needed:

| Criterion | Weight | Signal |
|---|---|---|
| Specificity | 25% | Concrete nouns, numbers, examples |
| Context | 20% | Background clauses, "given that…" patterns |
| Clarity | 20% | Absence of vague filler words |
| Instruction completeness | 20% | Action verb + subject + output format |
| Length fit | 15% | 20–2000 characters = full score |

The refiner UI shows animated score rings (before → after), an AI explanation of changes, a unified or side-by-side word-level diff, and thumbs up/down feedback that feeds back into model ranking.

---

## Marketplace Features

- **Browse** — paginated grid with category pills, sort by newest / most forked / top rated
- **Advanced filters** — filter by price range, minimum rating, quality score threshold
- **Preview** — full prompt body preview in a modal before importing
- **Import / Fork** — one click adds a prompt to your library; fork lineage is tracked
- **Ratings** — 5-star rating system per prompt, displayed as aggregate
- **Creator profiles** — each author has a public profile with their published prompts
- **Earnings** — creators see revenue, top-performing prompts, and payout history

---

## Chrome Extension

The extension is a **companion** to the web app — it lets you paste saved prompts directly into AI platforms without switching tabs.

**Supported platforms and injection methods:**

| Platform | Method |
|---|---|
| ChatGPT | `#prompt-textarea` via React synthetic event |
| Claude | `div[contenteditable]` via `InputEvent` |
| Gemini | Quill editor `.ql-editor` |
| Perplexity | `textarea.overflow-auto` |
| Grok | `textarea[placeholder]` |
| Microsoft Copilot | `#searchbox` |

**Key extension behaviors:**
- `Ctrl+Shift+P` opens the popup from any page
- Floating action button injected into every supported AI platform
- `{{variable}}` template substitution modal — fill in variables before pasting
- Offline-first: prompts cached in Chrome Storage + IndexedDB, mutations queued and replayed by the MV3 service worker when connectivity returns

---

## Deployment

### Production Stack

| Service | Host |
|---|---|
| FastAPI backend | [Railway.app](https://railway.app) (Docker, auto-deploys from `main`) |
| React web app | [Vercel](https://vercel.com) (edge CDN, auto-deploys from `main`) |
| PostgreSQL | Supabase free tier → Railway Postgres at scale |
| Redis | Upstash free tier → upgrade on growth |
| DNS + DDoS | Cloudflare (free) |
| Chrome Extension | Chrome Web Store |

### CI/CD

GitHub Actions runs on every push and PR to `main`:

1. Spin up Postgres 15 + Redis 7 as service containers
2. Run Alembic migrations on the test database
3. Run the pytest suite with coverage reporting
4. Verify FastAPI import (smoke test)

---

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| 0 — Project Setup | Done | Monorepo, Docker, CI, migrations |
| 1 — Chrome Extension Core | Done | Popup, offline storage, FAB, keyboard shortcut |
| 2 — FastAPI Backend | Done | Auth, prompt CRUD, full-text search, rate limiting |
| 3 — AI Refinement Engine | Done | Fallback chain, quality scorer, diff view |
| 4 — One-Click Paste Engine | Done | Platform content scripts, `{{variable}}` templates |
| 5 — React Web Dashboard | Done | Library, refiner, marketplace, creator profiles, earnings |
| 6 — QA & Polish | Done | TypeScript clean build, lazy routes, a11y (WCAG 2.1 AA), dark mode |
| **7 — Launch** | **Next** | Chrome Web Store listing, Railway/Vercel deploy, landing page, Product Hunt |
| 8 — Post-Launch | Planned | Edge browser, Bengali UI, batch AI refine, public prompt sharing links |
| 9 — Subscription Layer | Future | Stripe billing, Pro/Enterprise tiers, team prompt libraries |

---

## Contributing

1. Fork and create a branch from `main`.
2. For backend changes, write or update tests — target >70% coverage.
3. Run `npm run type-check` in `web/` before opening a PR — zero TypeScript errors required.
4. Keep code comments rare; only add one when the *why* is non-obvious.
5. Open a pull request against `main` with a clear description of what changed and why.

---

> Prompt Base — write better prompts, share the best ones, and paste them anywhere.
