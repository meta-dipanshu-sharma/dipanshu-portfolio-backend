# Portfolio Backend

NestJS backend for Dipanshu Sharma's portfolio. Three features in one API:

1. **Analytics** — tracks page views, section scrolls, CTA clicks, chatbot usage
2. **Resume Tracking** — logs every resume download with geo + referrer data
3. **Contact Form** — stores messages in PostgreSQL, processes via BullMQ queue, sends email via Resend

## Stack

| Layer | Tech |
|---|---|
| Framework | NestJS 10 |
| Database | PostgreSQL via Prisma (hosted on Neon) |
| Queue | BullMQ + Redis (hosted on Upstash) |
| Email | Resend |
| Hosting | Railway |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/analytics/pageview` | None | Track a page view |
| POST | `/analytics/event` | None | Track a custom event |
| POST | `/resume/download` | None | Log resume download, get URL |
| GET | `/resume/redirect` | None | Log + redirect to PDF |
| POST | `/contact` | None | Submit contact form |
| GET | `/dashboard` | x-api-key | Overview stats |
| GET | `/dashboard/countries` | x-api-key | Top countries |
| GET | `/dashboard/sections` | x-api-key | Most viewed sections |
| GET | `/dashboard/chatbot` | x-api-key | Top chatbot questions |
| GET | `/dashboard/daily` | x-api-key | Daily visit chart data |
| GET | `/dashboard/devices` | x-api-key | Device breakdown |
| GET | `/dashboard/referrers` | x-api-key | Top referrers |
| GET | `/api/docs` | None | Swagger UI |

## Local Setup

### Run locally

```bash
npm run start:dev
```

API runs at `http://localhost:4000`  
Swagger docs at `http://localhost:4000/api/docs`

## Connecting the Frontend

Add this to your portfolio frontend's `.env.local`:

```bash
VITE_BACKEND_URL=https://portfolio-backend-production.up.railway.app
```

Then use it in your frontend code:

```ts
const API = import.meta.env.VITE_BACKEND_URL;

// Track page view
fetch(`${API}/analytics/pageview`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, path: '/', device: 'desktop' })
});

// Track section scroll
fetch(`${API}/analytics/event`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, eventType: 'section_view', payload: { section: 'work' } })
});

// Resume download
const res = await fetch(`${API}/resume/download?sessionId=${sessionId}`, { method: 'POST' });
const { url } = await res.json();
window.open(url, '_blank');

// Contact form
fetch(`${API}/contact`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, message })
});

// Dashboard (private — use your DASHBOARD_API_KEY)
fetch(`${API}/dashboard`, {
  headers: { 'x-api-key': 'your-dashboard-key' }
});
```

## Architecture

```
Frontend (Vercel)
      │
      ├── POST /analytics/pageview   ─→ PageView table
      ├── POST /analytics/event      ─→ AnalyticsEvent table
      ├── POST /resume/download      ─→ ResumeDownload table
      ├── POST /contact              ─→ ContactMessage table
      │                                       │
      │                                  BullMQ Queue (Redis/Upstash)
      │                                       │
      │                                  Worker picks up job
      │                                       │
      │                                  Resend sends email
      │                                       │
      │                                  ContactMessage.status = SENT
      │
      └── GET /dashboard/*  ──(x-api-key)──→ Aggregated stats from all tables
```
