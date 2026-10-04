# Expense Claim Policy Review Assistant

An internal tool that reviews employee expense claims against organisational policy using a combination of deterministic rule validation and Gemini AI-powered classification.

Built as part of the Aggroso candidate assessment (Problem 1 — Medium difficulty).

Live Demo: [ADD DEPLOYED URL]  
GitHub: https://github.com/Manaskr88/expense-policy-reviewer

---

## Overview

Finance teams spend significant time manually reviewing expense claims to check policy compliance. This application automates the first-pass review by:

- Running deterministic checks (amount limits, receipt requirements, duplicate detection, field validation) instantly and reliably.
- Using Gemini AI to classify ambiguous expense descriptions, identify missing policy-required information, and generate a plain-language explanation of the finding.
- Combining both results into a structured review that a human reviewer can act on — approve, reject, request clarification, or override the AI classification with a reason.

Every decision is logged in a review history, making the process fully auditable.

---

## Features

**AI Workflow**
- Classifies ambiguous expense descriptions into policy categories
- Explains why a claim complies, needs clarification, or needs review
- Identifies missing information required by policy
- Cites the exact policy text behind each finding
- Surfaces low-confidence classifications clearly so reviewers know when to look closer

**Deterministic Validation**
- Required field checks
- Date validity and future-date detection
- Amount > 0 validation
- Currency support check
- Category spending limit enforcement
- Receipt requirement check
- Business purpose / client info checks where required
- Duplicate claim detection (same claimant, date, amount, category)

**Reviewer Actions**
- Approve claim
- Reject claim (reason required)
- Request clarification (message required)
- Override AI classification (new category + reason required)
- View complete per-claim and system-wide review history

---

## Architecture

```
Browser (React + Vite)
        │
        │ REST API (fetch)
        ▼
Express.js (Node.js)
        │
        ├── Deterministic Validator  ←── Policy DB (MongoDB)
        │
        ├── Gemini AI Service  ←── (claim + policy + validation context)
        │
        └── MongoDB (Mongoose)
                ├── claims
                ├── policies
                └── reviewhistories
```

The key design principle: **AI handles language understanding; deterministic code handles business rules.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Icons | Lucide React |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI | Google Gemini 1.5 Flash via `@google/generative-ai` |
| Tests | Jest (ESM) |

---

## Project Structure

```
expense-policy-reviewer/
│
├── client/
│   ├── src/
│   │   ├── components/     # StatusBadge, ValidationChecks, Toast, Spinner, etc.
│   │   ├── pages/          # Dashboard, Claims, NewClaim, ClaimReview, etc.
│   │   ├── layouts/        # AppLayout (sidebar)
│   │   ├── services/       # api.js — all fetch calls
│   │   ├── hooks/          # useToast
│   │   └── utils/          # formatters.js
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── controllers/    # claimController, dashboardController, policyController
│   │   ├── routes/         # claims, policies, dashboard
│   │   ├── models/         # Claim, Policy, ReviewHistory
│   │   ├── services/
│   │   │   ├── ai/         # geminiService.js, aiPrompt.js
│   │   │   ├── policy/     # policyService.js
│   │   │   └── validation/ # claimValidator.js
│   │   ├── middleware/     # errorHandler.js
│   │   └── config/         # db.js, policyData.js, seed.js
│   └── tests/              # claimValidator.test.js
│
├── docs/
│   └── PROJECT_FLOW.md
│
├── README.md
├── .env.example
└── .gitignore
```

---

## Environment Variables

### Backend (`server/.env`)

```env
MONGODB_URI=mongodb://localhost:27017/expense-policy-reviewer
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
CLIENT_URL=http://localhost:5173
```

### Frontend (`client/.env.local`)

```env
VITE_API_URL=http://localhost:5000
```

The Gemini API key is **only** on the backend. It is never sent to the browser.

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)
- A Google Gemini API key

### 1. Clone and install

```bash
git clone https://github.com/Manaskr88/expense-policy-reviewer.git
cd expense-policy-reviewer

npm install --prefix server
npm install --prefix client
```

### 2. Configure backend environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and fill in your `MONGODB_URI` and `GEMINI_API_KEY`.

### 3. Configure frontend environment

The `client/.env.local` file already points to `http://localhost:5000`. No changes needed for local development.

---

## MongoDB Setup

Make sure MongoDB is running:

```bash
# Local MongoDB
mongod --dbpath /data/db

# Or use MongoDB Atlas — just set MONGODB_URI to your Atlas connection string
```

---

## Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Add it to `server/.env` as `GEMINI_API_KEY`

The application uses `gemini-1.5-flash` — fast and cost-efficient for this use case.

---

## Database Seeding

Seed the database with 6 realistic sample claims and all policy records:

```bash
npm run seed --prefix server
# or from the root:
npm run seed
```

This inserts:
1. Compliant travel claim (Arjun Mehta — ₹3,200 train fare)
2. Over-limit accommodation claim (Priya Sharma — ₹9,200 hotel)
3. Missing receipt meals claim (Vikram Nair — ₹1,500 team lunch)
4. Duplicate travel claim (Arjun Mehta — same as #1)
5. Ambiguous client dinner (Sneha Reddy — ₹4,800 with missing business purpose)
6. Office supplies claim (Rohan Das — ₹850 stationery)

---

## Running the Application

### Backend

```bash
cd server
npm run dev
# Server starts on http://localhost:5000
```

### Frontend

```bash
cd client
npm run dev
# App opens on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to the backend automatically.

---

## API Overview

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard/stats` | Dashboard statistics + recent claims |
| GET | `/api/dashboard/history` | All review history (paginated) |
| GET | `/api/claims` | List claims (search, filter, sort) |
| POST | `/api/claims` | Submit new claim (triggers validation + AI review) |
| GET | `/api/claims/:id` | Get single claim with full review data |
| POST | `/api/claims/:id/approve` | Approve claim |
| POST | `/api/claims/:id/reject` | Reject claim (reason required) |
| POST | `/api/claims/:id/clarification` | Request clarification |
| POST | `/api/claims/:id/override` | Override AI classification |
| GET | `/api/claims/:id/history` | Per-claim review history |
| GET | `/api/policies` | All policy records |

---

## Testing

Run the deterministic validation engine unit tests:

```bash
cd server
npm test
```

Tests cover:
- Valid claim passes all checks
- Amount over limit fails
- Missing receipt fails
- Future date fails
- Missing required field fails
- Duplicate claim detected
- Invalid date fails
- Zero amount fails

---

## Deployment Instructions

### Backend (e.g. Render, Railway, Fly.io)

1. Set environment variables: `MONGODB_URI`, `GEMINI_API_KEY`, `PORT`, `CLIENT_URL`
2. Build command: `npm install`
3. Start command: `node src/index.js`
4. Run seed after first deploy: `node src/config/seed.js`

### Frontend (e.g. Vercel, Netlify)

1. Build command: `npm run build`
2. Output directory: `dist`
3. Set environment variable: `VITE_API_URL=https://your-backend-url.com`

---

## Known Limitations

- No authentication — this is a single-reviewer prototype. A production version would add JWT auth and role-based access.
- Gemini API calls are made synchronously at claim submission. Under high load this could be moved to a background queue.
- Receipt attachment (file upload / OCR) is not implemented — the "receipt available" field is a self-reported boolean.
- Currency conversion is not performed — amounts are compared against policy limits in the claim's submitted currency.

---

## Security Notes

- `GEMINI_API_KEY` is stored only in `server/.env` and never exposed to the React frontend.
- The `.gitignore` excludes all `.env` files from commits.
- Input is validated on both the frontend (form) and backend (controller + validator) layers.
- Error responses never expose stack traces or internal details to clients.

---

## AI Design Decisions

**Why AI here at all?**  
Expense descriptions are written in natural language and are often ambiguous. "Dinner at Taj" could be personal or client entertainment. AI handles this classification problem well; a rule engine cannot.

**Why not let Gemini decide everything?**  
Policy limits, date validity, duplicate detection, and receipt requirements are deterministic rules. They must be calculated by code to be reliable, auditable, and testable. The LLM receives these results as context but cannot override them.

**How is hallucination risk managed?**  
- The AI receives the actual policy text from the database — it cannot invent limits.
- Its output is forced into a strict JSON schema with a controlled set of allowed values.
- Deterministic checks remain authoritative regardless of what the AI says.
- Low-confidence responses are flagged visibly so reviewers know to scrutinise them.

**What if Gemini is unavailable?**  
The claim is saved, deterministic validation runs normally, and the review page shows "AI review unavailable". The reviewer can still approve, reject, or request clarification using the validation results.
