---
name: CyberSentry Python Backend
description: Architecture and fallback contract for the Python FastAPI microservice that backs CyberSentry endpoints.
---

## Architecture

- Python FastAPI service: `artifacts/cybersentry-api/main.py` — listens on port 8000.
- Express api-server (`artifacts/api-server/src/routes/cybersentry.ts`) forwards all `/api/cybersentry/*` requests to the Python service via `fetch`.
- Workflow: "CyberSentry Python API" — command: `cd artifacts/cybersentry-api && pip install -q -r requirements.txt && python -m uvicorn main:app --host 0.0.0.0 --port 8000`
- Python 3.11 is installed; packages: fastapi, uvicorn[standard], httpx (tracked in `requirements.txt`).

## Fallback Contract (important)

**Why:** Code review found that falling through to demo data on API failure with HTTP 200 masks real outages and drives incorrect security decisions.

**Rule:** Demo mode is STRICTLY gated by missing key (`DEMO_PHONE = PHONE_API_KEY is None`):
- Key absent → demo mode always, labeled `source: "demo"` with `[DEMO-режим]` in details.
- Key present + API succeeds → real result, labeled `source: "numlookupapi"` / `"hibp"`.
- Key present + API fails → HTTP 502, never falls through to demo data.

**emailrep.io** (free, no key) is used as a best-effort enrichment in demo mode only; if it fails, full static demo data is returned.

## API Keys (Replit Secrets)

- `PHONE_API_KEY` → numlookupapi.com (free tier, 1000 req/mo)
- `BREACH_API_KEY` → Have I Been Pwned v3 (paid, $3.50/mo minimum)

## Spam Knowledge Base

Local `KNOWN_SPAM_NUMBERS` dict + `SPAM_PATTERNS` regex list cover RU/KZ fraud patterns. Always checked first regardless of API mode.

## Security Log

In-memory `deque(maxlen=100)` seeded with boot events. Every phone/email request appends a real-time entry. `GET /cybersentry/log` returns up to 50 newest entries. Single-process async (FastAPI default), no threading issues.
