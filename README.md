# SiteIQ — AI Website Audit & Lead Funnel System

> Automated website audits that convert visitors into qualified leads and sync directly with a CRM pipeline.

**Live demo:** [https://ai-site-audit-production.up.railway.app/](#) &nbsp;|&nbsp; **Built with:** Next.js · Groq (LLaMA 3.3) · PostgreSQL · HubSpot API

---

## The Business Problem

Web agencies and SaaS sales teams waste hours doing manual site audits — inconsistent quality, slow turnaround, and leads going cold before follow-up happens. This system solves all three:

- **Manual audits take too long** → SiteIQ generates a structured, scored audit in under 60 seconds
- **Inconsistent quality** → every audit follows the same AI-driven framework across 5 dimensions
- **Lost leads from slow follow-up** → lead data is captured at the moment of highest intent and pushed to HubSpot automatically

**The result:** a sales team that wakes up to warm leads already in their CRM pipeline, with full context on each prospect's site before the first call.

---

## How It Works

```
User enters URL
      ↓
Site is scraped (Puppeteer + fetch fallback)
      ↓
AI analyzes content across 5 dimensions
      ↓
Preview shown free — full report gated behind email
      ↓
Lead submits info → full report unlocked
      ↓
Contact + deal created in HubSpot automatically
      ↓
Sales team notified with audit score + report link
```

---

## Features

### AI Audit Engine
- Scrapes any website using `fetch` with a Puppeteer fallback for JS-rendered sites
- Handles scrape failures gracefully — falls back to partial data rather than crashing
- Sends structured page data to LLaMA 3.3 (via Groq) with a constrained prompt that forces specific, site-specific insights — not generic advice
- Returns scored results across 5 dimensions: SEO, UX, Conversion, Performance, and Content

### Lead Gating System
- Preview page shows overall score + SEO and UX sections for free
- Conversion, Performance, and Content sections are blurred and gated
- Lead capture modal collects name, email, and company before unlocking
- Designed to maximize conversion at peak interest — right after the user sees their score

### CRM Automation
- On unlock, creates a HubSpot contact and associated deal automatically
- Deal is pre-populated with audit score and a direct link to the full report
- Non-blocking — a HubSpot outage never breaks the user-facing flow
- Built to extend: pipeline stage, lead source, and custom properties can be added without restructuring

### Async Processing
- Audit job is kicked off immediately and returns an ID
- Frontend polls for status every 2.5 seconds
- Loading state with spinner keeps the user informed
- Audit result is persisted to PostgreSQL — report is accessible at any time via its URL

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)             │
│  Homepage → Audit Preview → Lead Gate → Report  │
└───────────────────┬─────────────────────────────┘
                    │ API Routes
┌───────────────────▼─────────────────────────────┐
│                  Backend (Node.js)               │
│   Scraper (fetch + Puppeteer) → AI → Database   │
└──────┬────────────────────────────┬─────────────┘
       │                            │
┌──────▼──────┐            ┌───────▼───────┐
│  PostgreSQL  │            │  HubSpot API  │
│  (Prisma)   │            │  CRM Sync     │
└─────────────┘            └───────────────┘
```

**Request lifecycle:**
1. `POST /api/audit` — creates a database record, fires async scrape + AI job, returns audit ID immediately
2. `GET /api/audit/[id]` — frontend polls this; returns preview data when complete, full data only if unlocked
3. `POST /api/unlock` — saves lead info, marks audit as unlocked, triggers HubSpot sync

---

## Technical Decisions & Tradeoffs

**Why Next.js instead of plain React**
API routes live alongside the frontend in one codebase — no separate Express server to deploy or maintain. Server-side processing keeps API keys off the client.

**Why Groq instead of OpenAI**
Groq runs LLaMA 3.3 70B at significantly faster inference speeds with a generous free tier. For structured JSON output with a constrained prompt, the quality difference from GPT-4o is negligible while the cost difference is significant at scale.

**Why async processing for audits**
Scraping + AI can take 15–45 seconds depending on the site. Returning an ID immediately and polling prevents HTTP timeouts and gives the frontend control over the loading experience.

**Tradeoff: speed vs depth of analysis**
The scraper caps body text at 5,000 characters to keep the AI prompt fast and cheap. For most business sites this is sufficient. A deeper analysis mode (full crawl, multiple pages) is the natural next iteration.

**Handling sites that block scraping**
The scraper tries plain `fetch` first (fast, works for most static sites), then falls back to Puppeteer with a realistic user-agent string for JS-rendered sites. If both fail, the AI still runs with whatever partial data was collected rather than returning a hard error.

**Handling unpredictable AI output**
The prompt explicitly demands raw JSON with no markdown or preamble. The response handler strips any accidental backtick fences and catches JSON parse errors with a descriptive message rather than a silent 500.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS |
| Backend | Next.js API Routes (Node.js) |
| AI | Groq API — LLaMA 3.3 70B |
| Database | PostgreSQL via Prisma ORM |
| Scraping | Native fetch + Puppeteer |
| CRM | HubSpot REST API v3 |
| Language | TypeScript throughout |

---

## Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- [Groq API key](https://console.groq.com) (free)
- HubSpot API key (optional — app works without it)

### Setup

```bash
git clone https://github.com/jsandau/site-iq.git
cd site-iq
npm install
```

Create `.env.local`:
```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/audit_tool"
GROQ_API_KEY="gsk_..."
HUBSPOT_API_KEY="your-key"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

```bash
npx prisma db push
npx prisma generate
npm run dev
```

Open `http://localhost:3000`, enter any website URL, and the audit runs automatically.

---

## What I'd Build Next

- **Background job queue** (Redis + BullMQ) to handle concurrent audits without blocking the Node process
- **Multi-page crawling** — audit more than just the homepage for a fuller picture
- **Industry-based scoring** — weight criteria differently for e-commerce vs SaaS vs local business
- **PDF export** — generate a branded, downloadable report using React PDF
- **Onboarding flow** — multi-step client intake form with Stripe payments and saved progress, feeding directly into the same HubSpot pipeline

---

## Key Takeaways

This project demonstrates:
- Building a complete lead generation system, not just a UI or a model wrapper
- Integrating external APIs (AI inference, CRM) into a real business workflow
- Designing for real-world failure modes — scrape blocks, slow APIs, malformed AI output
- Making technical decisions based on business impact, not just technical preference
- Shipping a system a sales team could actually use tomorrow
