# PromptVault Pro — Implementation Plan

## Phase 0 — Project Setup (Week 1)
- Initialize monorepo structure: `extension/`, `backend/`, `web/`
- Configure Docker Compose (PostgreSQL 15, Redis 7, FastAPI)
- Set up GitHub Actions CI pipeline (lint → test → build)
- Apply initial Alembic database migrations (users, prompts, history tables)
- Configure environment variables and `.env.example`
- Set up Nginx reverse proxy config with SSL

---

## Phase 1 — Chrome Extension Core (Weeks 2–3)
- Scaffold Manifest V3 extension with Vite build
- Build popup UI (420×600px, dark mode default, CSS variables)
- Implement Chrome Storage API + IndexedDB wrapper for offline-first storage
- Add real-time search bar with <50ms debounce (client-side)
- Implement save/edit/delete prompt CRUD locally
- Add `Ctrl+Shift+P` keyboard shortcut
- Build service worker for background sync queue (offline → online)
- Inject floating action button (FAB) into all AI platform pages

---

## Phase 2 — FastAPI Backend (Weeks 3–4)
- Implement JWT auth: register, login, refresh token rotation, logout
- Add Google OAuth2 sign-in flow
- Build all `/prompts/*` REST endpoints (CRUD, search, versions, duplicate, import/export)
- Implement full-text search using PostgreSQL `to_tsvector` GIN index
- Build `/history/*` endpoints (log usage events, browse, clear)
- Add Redis-based rate limiter middleware (100 req/min API, 20 req/min AI)
- Write unit tests (pytest) and integration tests (httpx TestClient) targeting >70% coverage
- Connect extension to backend: sync saved prompts and history

---

## Phase 3 — AI Refinement Engine (Week 5)
- Integrate OpenRouter Gemma 3 via async httpx client
- Implement fallback chain: OpenRouter → Groq → Ollama → rule-based heuristic
- Build `/ai/refine`, `/ai/score`, `/ai/suggest-tags`, `/ai/feedback` endpoints
- Implement local heuristic quality scorer (0–100, no AI call needed)
- Add refinement style selector (Professional / Creative / Technical / Concise)
- Store refinement history per prompt (last 10)
- Build diff view in popup (original vs. refined, side-by-side)
- Add thumbs up/down feedback endpoint

---

## Phase 4 — One-Click Paste Engine (Week 6)
- Write platform-specific content scripts for ChatGPT, Claude, Gemini, Perplexity, Grok, Copilot
- Handle React synthetic events (ChatGPT), contenteditable (Claude), Quill editor (Gemini)
- Implement `{{variable}}` template substitution modal in popup
- Add clipboard copy fallback when DOM injection fails
- Add optional auto-submit toggle (off by default) in extension settings
- Show toast notification after successful paste
- Add custom platform selector setting for power users

---

## Phase 5 — React Web Dashboard (Weeks 7–8)
- Scaffold React 18 + TypeScript + Tailwind CSS + Vite app
- Build auth screens: login, register, Google sign-in
- Build prompt library view: list, search, filter by category/tag, sort options
- Build prompt editor: full CRUD, version history panel, character count, tag typeahead
- Build AI refiner view: input prompt, style selector, diff viewer, quality score display
- Build history view: paginated table, date filter, re-use button, pin-to-library
- Build analytics dashboard: Recharts graphs (top prompts, platform breakdown, active hours)
- Build settings page: theme toggle, account info, export/import, connected API keys
- Add bulk import (JSON/CSV upload) and bulk export
- Deploy to Vercel (auto-deploy from main branch)

---

## Phase 6 — Polish, QA & Security Hardening (Week 9)
- Full QA pass: all critical and high priority requirements from SRS
- Accessibility audit: WCAG 2.1 AA on web dashboard
- Performance audit: popup load <200ms, API p95 <500ms, search <50ms
- Playwright E2E tests: login → save prompt → refine → paste flow
- OWASP ZAP security scan: fix any SQL injection, XSS, auth bypass findings
- Dark/light mode visual QA across all UI surfaces
- Optimize bundle sizes (Vite tree-shaking, lazy routes in web app)
- Verify offline mode: all core flows work without network

---

## Phase 7 — Launch (Week 10)
- Submit extension to Chrome Web Store (complete CWS listing, screenshots, privacy policy)
- Deploy backend to Railway.app with production PostgreSQL and Upstash Redis
- Deploy web app to Vercel production domain
- Set up health check monitoring (`/health` endpoint, uptime alerts)
- Write landing page (static, deploy to Vercel or Cloudflare Pages)
- Publish on Product Hunt
- Set up error tracking (Sentry free tier — backend + web app)

---

## Phase 8 — Post-Launch Iterations (Weeks 11–14)
- Gather user feedback, fix selector breakage from AI platform UI updates
- Add Edge browser support (same extension, minor manifest tweaks)
- Add Bengali (Bangla) UI string support
- Implement weekly summary report (in-app notification or email via Resend free tier)
- Add batch AI refinement (web app only, queued background job)
- Add prompt sharing via public link (read-only shareable URL)
- Performance monitoring and database query optimization based on real usage

---

## Phase 9 — Subscription Layer (Future — Post Product-Market Fit)
- Integrate Stripe Checkout and webhook handler
- Implement `subscriptions` table and `PlanGate` middleware
- Gate Pro features: unlimited AI refinements, 1-year history, advanced analytics, batch refine, custom AI endpoint
- Build upgrade/downgrade flow in web dashboard settings
- Add Enterprise tier: team prompt libraries, SSO, shared collections
- Set up Stripe billing portal for self-serve plan management
