# PromptVault Pro — System Architecture

## 1. Overview

PromptVault Pro is a three-surface product: a Chrome Extension (primary UX), a FastAPI REST backend, and a React web dashboard. The system is designed free-first with a subscription layer added in a future phase. All core features remain available on the free tier; premium features (batch AI, advanced analytics, team sharing) will be gated behind Pro/Enterprise plans.

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER SURFACES                            │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │  Chrome Extension │  │  React Web App   │                    │
│  │  (Popup + Content │  │  (Dashboard PWA) │                    │
│  │   Script + SW)    │  │                  │                    │
│  └────────┬─────────┘  └────────┬─────────┘                    │
└───────────┼─────────────────────┼────────────────────────────-─┘
            │  HTTPS REST / JWT   │
┌───────────▼─────────────────────▼────────────────────────────-─┐
│                     FastAPI Backend (v1)                         │
│  Auth │ Prompts │ AI Refinement │ History │ Analytics │ Billing  │
└──────┬──────────────────────┬──────────────────────────────────-┘
       │                      │
  ┌────▼────┐           ┌─────▼──────┐     ┌──────────────────┐
  │PostgreSQL│           │   Redis    │     │ AI Engine Layer  │
  │   (ORM) │           │(Cache/Rate)│     │ OpenRouter/Groq  │
  └─────────┘           └────────────┘     │ /Ollama (Gemma3) │
                                           └──────────────────┘
```

---

## 2. Chrome Extension Architecture

### Layer Breakdown
```
manifest.json (MV3)
├── popup/
│   ├── popup.html          ← 420×600 overlay UI
│   ├── popup.js            ← Vanilla JS, no framework
│   └── popup.css           ← CSS variables (dark/light)
├── content_scripts/
│   ├── injector.js         ← Floating FAB injection
│   ├── paste_engine.js     ← DOM input injection per platform
│   └── platforms/
│       ├── chatgpt.js      ← #prompt-textarea (React synth event)
│       ├── claude.js       ← div[contenteditable] (InputEvent)
│       ├── gemini.js       ← Quill editor (.ql-editor)
│       ├── perplexity.js   ← textarea.overflow-auto
│       ├── grok.js         ← textarea[placeholder]
│       └── copilot.js      ← #searchbox
├── background/
│   └── service_worker.js   ← Offline queue, sync, badge count
└── storage/
    └── local_store.js      ← Chrome Storage API + IndexedDB wrapper
```

### Data Flow (Extension)
```
User click
  → popup.js opens (target: <200ms)
  → reads from Chrome Storage (offline-first)
  → on network: syncs with FastAPI (background SW)
  → user selects prompt → paste_engine.js
  → content_script injects into AI platform input
  → history event logged locally → queued for backend sync
```

### Offline Strategy
- All saved prompts cached in `chrome.storage.local` (5MB limit) and IndexedDB (unlimited).
- Mutations while offline are queued in a `sync_queue` array in IndexedDB.
- Service worker replays queue when connectivity restored using `chrome.alarms` API.

---

## 3. FastAPI Backend Architecture

### Module Structure
```
app/
├── main.py                 ← FastAPI app init, CORS, middleware
├── config.py               ← Settings (pydantic-settings, env vars)
├── database.py             ← Async SQLAlchemy engine + session
├── redis_client.py         ← Async Redis connection
│
├── routers/
│   ├── auth.py             ← /auth/* (register, login, OAuth2)
│   ├── prompts.py          ← /prompts/* (CRUD, search, export)
│   ├── ai.py               ← /ai/* (refine, score, suggest-tags)
│   ├── history.py          ← /history/* (log, browse, clear)
│   ├── analytics.py        ← /analytics/* (summary, charts)
│   └── billing.py          ← /billing/* (plan, upgrade — future)
│
├── models/                 ← SQLAlchemy ORM models
│   ├── user.py
│   ├── prompt.py
│   ├── prompt_version.py
│   ├── history.py
│   └── refinement.py
│
├── schemas/                ← Pydantic v2 request/response schemas
│   ├── auth.py
│   ├── prompt.py
│   ├── ai.py
│   └── analytics.py
│
├── services/               ← Business logic (no DB calls here)
│   ├── auth_service.py     ← JWT, bcrypt, OAuth token exchange
│   ├── prompt_service.py   ← CRUD, versioning, search
│   ├── ai_service.py       ← Gemma 3 calls, fallback chain
│   ├── history_service.py  ← Usage logging, GDPR delete
│   └── billing_service.py  ← Plan gating, Stripe webhooks (future)
│
├── middleware/
│   ├── rate_limiter.py     ← Redis sliding window (100/min user, 20/min AI)
│   └── auth_middleware.py  ← JWT decode, user injection into request state
│
└── utils/
    ├── quality_scorer.py   ← Heuristic prompt scoring (0-100)
    ├── variable_parser.py  ← {{variable}} extraction and substitution
    └── platform_detect.py  ← URL → platform name mapping
```

### Request Lifecycle
```
HTTP Request
  → Nginx (TLS termination, reverse proxy)
  → Uvicorn (ASGI)
  → Auth Middleware (JWT decode → user_id in request.state)
  → Rate Limiter (Redis sliding window check)
  → Router → Service → ORM → PostgreSQL
  → Response (Pydantic serialization)
```

---

## 4. React Web Dashboard Architecture

### Structure
```
web/
├── src/
│   ├── main.tsx            ← Vite entry, React 18 root
│   ├── App.tsx             ← Router, theme provider
│   ├── api/
│   │   └── client.ts       ← axios instance, JWT refresh interceptor
│   ├── features/
│   │   ├── auth/           ← Login, register, Google OAuth
│   │   ├── library/        ← Prompt list, editor, bulk actions
│   │   ├── refiner/        ← AI refinement UI, diff viewer
│   │   ├── history/        ← Usage history table, filters
│   │   ├── analytics/      ← Recharts dashboards
│   │   └── settings/       ← Theme, account, plan, API keys
│   ├── components/         ← Shared UI components (Button, Modal, Toast)
│   ├── hooks/              ← usePrompts, useAuth, useTheme
│   └── store/              ← Zustand global state
└── public/
    └── manifest.json       ← PWA manifest
```

---

## 5. Database Architecture

### Schema (PostgreSQL 15)

```sql
-- Users
users (id UUID PK, email, password_hash, display_name, avatar_url,
       auth_provider, plan VARCHAR(20) DEFAULT 'free',
       created_at, last_login_at, is_active)

-- Prompts
prompts (id UUID PK, user_id FK, title, body TEXT,
         category, tags TEXT[], is_favorite, use_count,
         quality_score SMALLINT, variables JSONB,
         is_deleted BOOL, created_at, updated_at)

-- Prompt Versions (last 5 per prompt)
prompt_versions (id UUID PK, prompt_id FK, body TEXT,
                 version_number INT, created_at)

-- Prompt History
prompt_history (id UUID PK, user_id FK, prompt_id FK NULLABLE,
                body_snapshot TEXT, platform VARCHAR(50),
                used_at TIMESTAMPTZ, was_refined BOOL)

-- AI Refinements
ai_refinements (id UUID PK, prompt_id FK, original_body TEXT,
                refined_body TEXT, style VARCHAR(20),
                explanation TEXT, score_before INT, score_after INT,
                user_rating SMALLINT, created_at)

-- Subscription Plans (future)
subscriptions (id UUID PK, user_id FK UNIQUE, plan VARCHAR(20),
               stripe_customer_id, stripe_subscription_id,
               current_period_end TIMESTAMPTZ, is_active BOOL)
```

### Indexes
```sql
CREATE INDEX idx_prompts_user_id ON prompts(user_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_prompts_fts ON prompts USING gin(to_tsvector('english', title || ' ' || body));
CREATE INDEX idx_history_user_used ON prompt_history(user_id, used_at DESC);
CREATE INDEX idx_history_platform ON prompt_history(user_id, platform);
```

---

## 6. Cache Layer (Redis 7)

| Key Pattern | TTL | Purpose |
|---|---|---|
| `session:{user_id}` | 30d | Refresh token validation |
| `rate:{user_id}:api` | 60s | Sliding window API rate limit |
| `rate:{user_id}:ai` | 60s | Sliding window AI rate limit |
| `prompt_count:{user_id}` | 5m | Extension badge count |
| `search:{user_id}:{hash}` | 2m | Search result cache |
| `plan:{user_id}` | 5m | Feature gate check cache |

---

## 7. AI Integration Architecture

### Fallback Chain
```
Request to /ai/refine
  → Try 1: OpenRouter Gemma 3 (cloud, free tier)
       timeout: 8s
  → Try 2: Groq Gemma 3 8B (faster free tier)
       timeout: 5s
  → Try 3: Ollama (local, if user configured endpoint)
       timeout: 15s
  → Try 4: Rule-based heuristic refinement
       always available, no network needed
```

### System Prompt Design
```
SYSTEM: You are an expert prompt engineer.
Refinement Style: {style}
Custom Instructions: {user_instruction}

Rules:
1. Preserve original intent
2. Be specific and clear
3. Add context where missing
4. Return ONLY the refined prompt
5. Then on new line: REASON: <1-sentence explanation>

USER: {original_prompt}
```

### Quality Scoring (Heuristic — runs locally, no AI call)
| Criterion | Weight | Signal |
|---|---|---|
| Specificity | 25% | Concrete nouns, numbers, examples |
| Context | 20% | Background clauses, "given that…" patterns |
| Clarity | 20% | Absence of vague words ("somehow", "good") |
| Length fit | 15% | 20–2000 chars = full score |
| Instruction completeness | 20% | Action verb + subject + output format present |

---

## 8. Security Architecture

| Layer | Control | Implementation |
|---|---|---|
| Transport | TLS 1.3 mandatory | Nginx SSL termination |
| Auth | JWT (15m access) + Refresh (30d, rotating) | python-jose, HttpOnly cookie |
| Passwords | bcrypt cost 12 | passlib[bcrypt] |
| Rate Limiting | 100 req/min API, 20 req/min AI | Redis sliding window |
| Input Validation | All inputs via Pydantic v2 | No raw SQL, ORM only |
| Extension isolation | host_permissions in manifest | Declared allowlist only |
| GDPR | Full data erasure on request | `DELETE /account` cascades all tables |
| Encryption at rest | PostgreSQL + filesystem AES-256 | Managed provider (Supabase/Railway) |

---

## 9. Subscription Architecture (Future — Phase 9+)

The free tier ships with full core features. The subscription layer is designed to slot in without changing existing code paths — it wraps behind a `PlanGate` middleware.

### Plan Tiers
| Feature | Free | Pro ($X/mo) | Enterprise |
|---|---|---|---|
| Saved prompts | Unlimited | Unlimited | Unlimited |
| AI refinements/day | 20 | Unlimited | Unlimited |
| Prompt history | 30 days | 1 year | Unlimited |
| Analytics | Basic | Advanced | Custom |
| Batch AI refine | No | Yes | Yes |
| Team sharing | No | No | Yes |
| Custom AI endpoint | No | Yes | Yes |
| Export formats | JSON, CSV | + Notion, Obsidian | + API |
| Priority support | No | Yes | Dedicated |

### Billing Integration (Stripe)
```
User clicks "Upgrade"
  → POST /billing/create-checkout (creates Stripe Checkout Session)
  → Redirect to Stripe hosted page
  → Stripe webhook → POST /billing/webhook
  → billing_service.py updates subscriptions table
  → Redis cache for plan invalidated (plan:{user_id})
  → Next API call reads Pro plan from DB
```

### PlanGate Middleware (future)
```python
# Wraps any endpoint with plan check
@require_plan("pro")
async def batch_refine(...):
    ...
```

---

## 10. Deployment Architecture

```
GitHub (main branch)
  → GitHub Actions CI (lint → test → build)
  ├── FastAPI → Railway.app (auto-deploy, Docker)
  ├── React Web App → Vercel (edge CDN)
  └── Extension build artifact → manual Chrome Web Store submit

Infrastructure:
  PostgreSQL  → Supabase (free 500MB) → upgrade to Railway Postgres
  Redis       → Upstash (free 10k req/day) → upgrade on growth
  AI API      → OpenRouter free tier → user-supplied keys (Pro)
  Domain      → Cloudflare (DNS + DDoS, free)
  SSL         → Let's Encrypt via Nginx (auto-renew)
```

### Environment Variables
```
DATABASE_URL        postgres+asyncpg://...
REDIS_URL           redis://...
JWT_SECRET          <256-bit random>
JWT_REFRESH_SECRET  <256-bit random>
OPENROUTER_API_KEY  <key>
GROQ_API_KEY        <key>
GOOGLE_CLIENT_ID    <OAuth>
GOOGLE_CLIENT_SECRET <OAuth>
STRIPE_SECRET_KEY   <future>
STRIPE_WEBHOOK_SECRET <future>
```

---

## 11. Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Extension UI framework | Vanilla JS (popup) | No bundle overhead, <200ms load target |
| Backend framework | FastAPI (async) | Native async, auto OpenAPI, Python AI ecosystem |
| ORM | SQLAlchemy 2.0 async | Type-safe, no raw SQL, async support |
| AI primary model | Gemma 3 via OpenRouter | Free, good quality, no vendor lock-in |
| Auth storage | JWT in memory + refresh in HttpOnly cookie | XSS resistant refresh token |
| Offline strategy | IndexedDB + Chrome Storage + SW sync queue | Core features work without network |
| Subscription billing | Stripe (future) | Industry standard, webhook-based, reliable |
| Deployment | Railway + Vercel + Supabase | Zero upfront cost, scales with usage |
