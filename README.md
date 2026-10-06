# Expense Claim Policy Review Assistant

An internal tool for reviewing employee expense claims against organisational policy. Built for the Aggroso candidate assessment (Problem 1).

**Live:** https://expense-policy-reviewer.onrender.com
**API:** https://expense-policy-reviewer-api.onrender.com
**GitHub:** https://github.com/Manaskr88/expense-policy-reviewer

---

## What it does

Finance teams waste time manually checking every expense claim against policy limits, receipt rules, and duplicate submissions. This tool handles that first-pass review automatically.

When a claim is submitted, the backend runs two things in parallel: a deterministic validation engine that enforces business rules (amount limits, receipt requirements, duplicate detection, date checks), and a Gemini AI call that reads the description, classifies the expense category, identifies missing information, and writes a plain-language explanation backed by the actual policy text.

The reviewer gets a structured finding — COMPLIANT, NEEDS CLARIFICATION, NEEDS REVIEW, or NON-COMPLIANT — and can approve, reject, request clarification, or override the AI classification with a reason. Everything is logged.

---

## Tech Stack

| | |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, Lucide React |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI | Google Gemini 2.5 Flash (REST API) |
| Tests | Jest (ESM) |

---

## Project Structure

```
expense-policy-reviewer/
├── client/
│   └── src/
│       ├── components/     StatusBadge, ValidationChecks, Toast, Spinner, PageHeader
│       ├── pages/          Dashboard, Claims, NewClaim, ClaimReview, ClaimHistory, ReviewHistory, Policy
│       ├── layouts/        AppLayout (sidebar navigation)
│       ├── services/       api.js
│       ├── hooks/          useToast
│       └── utils/          formatters.js
├── server/
│   └── src/
│       ├── controllers/    claimController, dashboardController, policyController
│       ├── routes/         claims, policies, dashboard
│       ├── models/         Claim, Policy, ReviewHistory
│       ├── services/
│       │   ├── ai/         geminiService.js, aiPrompt.js
│       │   ├── policy/     policyService.js
│       │   └── validation/ claimValidator.js
│       ├── middleware/     errorHandler.js
│       └── config/         db.js, policyData.js, seed.js
├── server/tests/           claimValidator.test.js
├── docs/                   PROJECT_FLOW.md
├── render.yaml
├── README.md
└── AGENT_USAGE.md
```

---

## Architecture

```
React (Vite)
     |
     | fetch /api/*
     v
Express.js
     |
     |-- claimValidator (deterministic) <-- Policy (MongoDB)
     |
     |-- geminiService (AI)  <-- Gemini REST API
     |
     v
MongoDB (claims, policies, reviewhistories)
```

AI handles language understanding. Deterministic code handles business rules. The final status is always computed by code, not the model.

---

## Local Setup

**Prerequisites:** Node.js 18+, MongoDB (local or Atlas), Gemini API key from https://aistudio.google.com

```bash
git clone https://github.com/Manaskr88/expense-policy-reviewer.git
cd expense-policy-reviewer

npm install --prefix server
npm install --prefix client
```

Copy and configure the backend env file:

```bash
cp server/.env.example server/.env
```

Fill in `MONGODB_URI` and `GEMINI_API_KEY` in `server/.env`.

The frontend `client/.env.local` already points to `http://localhost:5000` — no changes needed for local dev.

---

## Seed the Database

```bash
npm run seed --prefix server
```

This creates 7 policy records and 6 sample claims covering all review scenarios:

- Arjun Mehta — Travel ₹3,200 — COMPLIANT
- Priya Sharma — Accommodation ₹9,200 — NON_COMPLIANT (over limit)
- Vikram Nair — Meals ₹1,500 — NEEDS_CLARIFICATION (no receipt)
- Arjun Mehta — Travel ₹3,200 — NEEDS_REVIEW (duplicate)
- Sneha Reddy — Client Entertainment ₹4,800 — NEEDS_CLARIFICATION (missing business purpose)
- Rohan Das — Office Supplies ₹850 — NEEDS_CLARIFICATION

---

## Running Locally

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

---

## Environment Variables

**Backend** `server/.env`:

```
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
CLIENT_URL=http://localhost:5173
```

**Frontend** `client/.env.local`:

```
VITE_API_URL=http://localhost:5000
```

The Gemini key lives only on the backend and is never sent to the browser.

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/dashboard/stats | Stats and recent claims |
| GET | /api/dashboard/history | All review history |
| GET | /api/claims | List claims with search/filter/sort |
| POST | /api/claims | Submit claim (runs validation + AI) |
| GET | /api/claims/:id | Single claim with full review data |
| POST | /api/claims/:id/approve | Approve |
| POST | /api/claims/:id/reject | Reject (reason required) |
| POST | /api/claims/:id/clarification | Request clarification |
| POST | /api/claims/:id/override | Override AI classification |
| GET | /api/claims/:id/history | Per-claim audit trail |
| GET | /api/policies | All policy records |

---

## Tests

```bash
cd server && npm test
```

Covers: valid claim, amount over limit, missing receipt, future date, missing required field, duplicate detection, invalid date, zero amount.

---

## Deployment

Deployed on Render using `render.yaml` (Blueprint). Two services:

**Backend (Web Service)**
- Root: `server/`
- Build: `npm install`
- Start: `npm start`
- Env vars: `MONGODB_URI`, `GEMINI_API_KEY`, `PORT`, `CLIENT_URL`, `NODE_ENV=production`

**Frontend (Static Site)**
- Root: `client/`
- Build: `npm install && npm run build`
- Publish: `dist/`
- Env vars: `VITE_API_URL=https://expense-policy-reviewer-api.onrender.com`

After first deploy, run the seed script once:

```bash
node src/config/seed.js
```

---

## Completed Scope

- Full claim submission with AI review and deterministic validation
- Dashboard with live stats
- Claims list with search, filter, sort
- Claim review page with AI classification, policy checks, evidence, and all reviewer actions
- Reviewer override with mandatory reason
- Per-claim and system-wide review history
- Policy page showing all categories and limits
- Duplicate claim detection
- Graceful AI failure handling
- Unit tests for validation engine
- Deployed on Render with MongoDB Atlas

## Intentionally Excluded

- Authentication and user roles (single reviewer prototype)
- Receipt file upload and OCR
- Currency conversion
- Email notifications
- Payment or payroll integration

---

## Known Limitations

- The Gemini API key is a short-lived OAuth token. If AI shows as unavailable, the key has expired — generate a new one from https://aistudio.google.com and update the env var. The app continues working without AI using deterministic results only.
- AI calls are synchronous at submission time. Under high load this should move to a background queue.
- No authentication — any reviewer can take any action.

---

## AI Design

The model receives the claim, the full policy text from the database, and the deterministic validation results in every prompt. It cannot invent policy rules it was not given. Its output is a fixed JSON schema with a controlled set of allowed values. The final status is computed by `determineFinalStatus()` in code — the AI influences it through its finding and confidence fields but cannot override a hard validation failure.

See `docs/PROJECT_FLOW.md` for a complete walkthrough of the request flow, module design, and interview Q&A.
