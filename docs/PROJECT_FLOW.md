# Project Flow — Expense Claim Policy Review Assistant

This document explains the project end-to-end for interview preparation. It covers the user journey, every major module, key design decisions, and common interview questions with answers.

---

## 1. Project Overview

The Expense Claim Policy Review Assistant is a MERN-stack web application that helps finance teams review employee expense claims against a configured organisational policy.

It combines two complementary approaches:

- **Deterministic validation** — code that enforces fixed business rules: amount limits, receipt requirements, duplicate detection, field validation. This is reliable, fast, and testable.
- **AI classification** — Gemini 1.5 Flash interprets natural language descriptions, suggests policy categories, identifies missing information, and generates a plain-language explanation. This handles the parts that are too ambiguous for simple rules.

The output is a structured review that a human reviewer can act on.

---

## 2. Why the Project Exists

Expense claim review is a manual, repetitive process. A reviewer must:
1. Read the description and decide which policy category applies.
2. Look up the policy limit for that category.
3. Check whether a receipt was submitted.
4. Check whether required information (business purpose, client name) is present.
5. Cross-check for duplicate submissions.
6. Write a finding and decide to approve, reject, or ask for more information.

For obvious claims this is straightforward. But many claims have ambiguous descriptions ("client dinner", "supplies for the office"), missing context, or borderline amounts. These require judgement.

This application automates steps 2–5 deterministically and uses AI for step 1 and the generation of a human-readable explanation. The reviewer focuses on the decision, not the investigation.

---

## 3. User Journey

### Reviewer opens the dashboard
Sees total claims, approved count, claims needing review, and rejected count. Recent claims are listed in a table with status badges.

### Reviewer submits a new claim (or an employee submits on their behalf)
Fills in: claimant name, date, category (from a dropdown), amount, currency, description, receipt available (checkbox).

### After clicking "Submit & Review Claim"
The frontend POSTs to `/api/claims`. The backend:
1. Saves the claim with status `PENDING`.
2. Retrieves the relevant policy from MongoDB.
3. Runs deterministic validation synchronously.
4. Passes the claim + policy + validation results to Gemini.
5. Saves the AI result onto the claim document.
6. Determines the final status using a deterministic decision function.
7. Saves a `ReviewHistory` entry.
8. Returns the saved claim to the frontend.

The frontend navigates directly to the **Claim Review** page for that claim.

### Reviewer reads the Claim Review page
Sees:
- Claim details (claimant, date, category, amount, description, receipt)
- Duplicate warning (if detected) with a link to the original claim
- AI Classification — suggested category, confidence %, plain-language reason, missing information list
- Policy Check — a pass/fail checklist of every deterministic validation rule
- Final Finding — combined status with explanation
- Policy Evidence — the exact policy text the AI used
- Action buttons — Approve, Reject, Request Clarification, Override Classification

### Reviewer acts
Each action calls a dedicated API endpoint, updates the claim status, and appends a `ReviewHistory` record. The UI shows a toast notification and reflects the new status immediately.

---

## 4. Complete Request Flow

```
User fills out New Claim form
        │
        │ Basic frontend validation (required fields, positive amount)
        ▼
POST /api/claims
        │
        │ Express route → claimController.createClaim()
        ▼
Claim saved to MongoDB (status: PENDING)
        │
        ▼
ReviewHistory entry created (action: SUBMITTED)
        │
        ▼
policyService.getPolicyForCategory(category)
  → MongoDB Policy collection
  → Returns: limit, receiptRequired, requiresBusinessPurpose, policyText, etc.
        │
        ▼
claimValidator.validateClaim(claimData, policy)
  Runs all deterministic checks in sequence:
  - Required fields
  - Date validity
  - Future date
  - Amount > 0
  - Currency
  - Amount vs policy limit
  - Receipt requirement
  - Business purpose (if required)
  - Client info (if required)
  - Duplicate detection (DB query)
  Returns: { passed, checks[], duplicateClaimId }
        │
        ▼
geminiService.reviewClaimWithAI(claim, policy, validationResults)
  Builds prompt with:
  - Claim fields
  - Full policy text
  - Deterministic validation results (as context)
  Calls Gemini 1.5 Flash with responseMimeType: 'application/json'
  Parses and sanitises the response
  Returns: { category, confidence, classificationReason, missingInformation,
             finding, explanation, policyEvidence }
        │
        │ (If Gemini fails: returns { unavailable: true })
        ▼
policyService.determineFinalStatus(validationResults, aiResult)
  Applies decision logic:
  - Missing/invalid fields → NEEDS_REVIEW
  - Amount over limit → NON_COMPLIANT
  - Duplicate → NEEDS_REVIEW
  - Missing receipt / business purpose → NEEDS_CLARIFICATION
  - AI confidence < 0.6 → NEEDS_REVIEW
  - AI says NON_COMPLIANT / NEEDS_CLARIFICATION → honour it
  - All pass → COMPLIANT
        │
        ▼
Claim document updated with AI results + final status
ReviewHistory entry created (action: REVIEWED)
        │
        ▼
Response: full claim document returned to frontend
        │
        ▼
Frontend navigates to /claims/:id (Claim Review page)
        │
        ▼
Reviewer reads findings → Approve / Reject / Clarify / Override
        │
        ▼
POST /api/claims/:id/approve  (or reject / clarification / override)
        │
        ▼
Claim status updated
ReviewHistory entry created
        │
        ▼
Frontend shows toast notification + updated claim state
```

---

## 5. Major Backend Modules

### `server/src/index.js`
Express app entry point. Loads environment, connects MongoDB, mounts routes, registers error handler.

### `server/src/models/`

**Claim.js** — The central document. Stores claim fields, AI results (aiClassification, aiConfidence, aiReason, aiMissingInfo), policy evidence, validation results (embedded array of check objects), final finding, reviewer override, and audit fields (reviewedAt, reviewedBy).

**Policy.js** — One document per expense category. Stores the limit, currency, receiptRequired, requiresBusinessPurpose, requiresClientInfo, and policyText. The seed script populates seven categories.

**ReviewHistory.js** — Immutable audit log. One entry per action: SUBMITTED, REVIEWED, APPROVED, REJECTED, CLARIFICATION_REQUESTED, OVERRIDE. Stores claimId, action, previousStatus, newStatus, reason, actor, and optional metadata.

### `server/src/services/validation/claimValidator.js`
The deterministic validation engine. Takes claimData and a policy object, runs all checks in sequence, and returns a structured result. Each check is a `{ name, passed, message }` object. The duplicate check performs a MongoDB query. The validator is pure logic — it does not modify any document.

### `server/src/services/policy/policyService.js`
Two functions: `getPolicyForCategory` (single DB lookup) and `determineFinalStatus` (pure decision logic that combines validation results and AI findings to produce the final claim status).

### `server/src/services/ai/geminiService.js`
Initialises the Google Generative AI client lazily. Calls `reviewClaimWithAI` which builds the prompt, calls Gemini, and sanitises the response. If Gemini fails for any reason, returns `{ unavailable: true }` — the application never crashes due to an AI failure.

### `server/src/services/ai/aiPrompt.js`
Contains two functions: `buildSystemInstruction` (defines the AI's role and constraints) and `buildReviewPrompt` (constructs the actual review request with claim data, policy text, and validation results formatted as readable text).

### `server/src/controllers/claimController.js`
Handles all claim-related HTTP operations. `createClaim` orchestrates the full submission flow. Individual action handlers (`approveClaim`, `rejectClaim`, `requestClarification`, `overrideClassification`) update the claim and append to ReviewHistory.

### `server/src/config/seed.js`
Standalone script that clears and re-seeds the database with policy records and six realistic sample claims covering the main review scenarios.

---

## 6. Frontend Pages

### Dashboard (`/`)
Fetches `/api/dashboard/stats`. Displays stat cards (total, approved, needs review, rejected, non-compliant, pending) and a recent claims table. Clicking a claim navigates to its review page.

### Claims (`/claims`)
Fetches `/api/claims` with debounced search and filter parameters. Displays a sortable, filterable table. Clicking a row navigates to the review page.

### New Claim (`/claims/new`)
Controlled form with client-side validation. On submit, POSTs to `/api/claims` and navigates to the returned claim's review page. The submit button shows a spinner and "Running review…" while the backend processes.

### Claim Review (`/claims/:id`)
The most important page. Fetches the full claim document and renders it in clearly labelled sections: Claim Details, AI Classification, Policy Check, Final Finding, Policy Evidence. Shows a duplicate warning banner when applicable. Reviewer action buttons are shown only when the claim is not yet resolved. Each action panel (reject, clarification, override) is inline and requires mandatory input before the confirm button is enabled.

### Claim History (`/claims/:id/history`)
Timeline view of every ReviewHistory entry for a specific claim. Shows status transitions with before/after badges.

### Review History (`/history`)
System-wide table of all ReviewHistory entries with claim context. Allows navigating to any claim directly.

### Policy (`/policy`)
Renders all seven Policy documents from the database. Shows limit, receipt requirement, business purpose and client info requirements, full policy text, and notes.

---

## 7. MongoDB Models

### Claim
The most complex model. Key design choices:
- `validationResults` is an embedded subdocument (not a separate collection) because it belongs to the claim and is always read together.
- `aiMissingInfo` is a string array — simple to render as a list.
- `status` and `finalFinding` can differ temporarily. `status` reflects the current reviewer state (APPROVED, REJECTED) while `finalFinding` reflects the initial review outcome (COMPLIANT, NEEDS_CLARIFICATION, etc.).
- `overriddenCategory` and `overrideReason` are stored separately from `category` so the original submitted category and AI classification are preserved for audit.

### Policy
Simple configuration documents. Seven records, one per category. The `policyText` field is passed verbatim to Gemini — this is how the AI gets its policy knowledge without hallucinating rules.

### ReviewHistory
Append-only audit log. Uses `createdAt` for ordering. The `metadata` field (Mixed type) allows storing extra context like the previous and new categories for override events.

---

## 8. Policy Engine

Policy rules are stored in MongoDB, seeded from `server/src/config/policyData.js`. The deterministic validator receives the relevant policy object from a DB lookup — it never has policy rules hardcoded.

This means policy can be updated by editing the database without changing application code, and the AI always receives current policy text.

The `determineFinalStatus` function in `policyService.js` is the only place where validation results and AI findings are combined into a final status. It follows a priority order: hard failures (missing fields, invalid dates) → NON_COMPLIANT → NEEDS_REVIEW → NEEDS_CLARIFICATION → COMPLIANT.

---

## 9. Duplicate Detection

Implemented in `claimValidator.js`. Queries MongoDB for a claim with matching: claimant (exact), date (same calendar day), amount (exact numeric), category (exact). If one is found, the check fails with a message that includes the existing claim's ID.

The UI shows a yellow warning banner with a link to the original claim. The claim is still saved and can be reviewed — a duplicate might be legitimate (e.g. two separate trips on the same day).

---

## 10. Gemini Integration

Uses `@google/generative-ai` (the official Google SDK for Node.js). The model is `gemini-1.5-flash` — chosen for speed and cost efficiency.

Key configuration:
- `responseMimeType: 'application/json'` forces the model to return valid JSON every time.
- `temperature: 0.2` keeps responses consistent and factual.
- `systemInstruction` sets the model's role and hard constraints.

The model is initialised lazily on first use. If `GEMINI_API_KEY` is not set, the first AI call fails gracefully and the claim proceeds without AI review.

---

## 11. AI Prompt Design

The prompt has two parts:

**System instruction** (set once at model initialisation):
- Defines the role: expense claim policy reviewer.
- States constraints: only use provided policy, never invent rules, express uncertainty, return structured JSON.
- States that deterministic validation results are authoritative.

**User prompt** (built per claim):
- CLAIM section: all claim fields formatted as plain text.
- APPLICABLE POLICY section: the full policy document for the detected category.
- DETERMINISTIC VALIDATION RESULTS section: every check result as PASS/FAIL with message.
- TASK section: explicit instructions on what to do and the exact JSON schema to return.

By providing policy text and validation results in the prompt, the AI has all the context it needs without needing to retrieve anything from external sources or reason about things it wasn't told.

---

## 12. Why AI is NOT Used for Deterministic Validation

Financial policy rules — "amount must not exceed ₹5,000", "receipt is required", "date must not be in the future" — are precise, binary, and business-critical. They must produce identical results every time for the same input.

LLMs are probabilistic. Even with low temperature, asking a model "does ₹5,200 exceed the ₹5,000 limit?" is unnecessary risk. The model might interpret the question differently, round differently, or occasionally produce an unexpected response.

These checks are written as ordinary JavaScript: fast, unit-testable, predictable, and completely independent of API availability or cost.

---

## 13. How Hallucination Risk is Reduced

Three mechanisms:

1. **Grounded policy context** — The AI does not know the policy from training data. It receives the actual policy text from the application's database in every prompt. It cannot invent a limit it was not given.

2. **Structured output** — `responseMimeType: 'application/json'` and explicit schema in the prompt constrain the response format. The `sanitizeAIResponse` function in `geminiService.js` validates every field and rejects any values outside the allowed sets.

3. **Authoritative determinism** — Deterministic validation results are passed to the AI as context and stated as authoritative in the system instruction. The final status is computed by `determineFinalStatus`, not by the AI. Even if the AI returns `finding: "COMPLIANT"` for a claim that exceeded its limit, the deterministic function overrides it to `NON_COMPLIANT`.

---

## 14. What Happens if Gemini Fails

`geminiService.reviewClaimWithAI` wraps the entire Gemini call in a try/catch. On any failure (network error, invalid API key, quota exceeded, malformed response) it logs the error and returns `{ unavailable: true }`.

The controller checks for this flag:
- Sets `claim.aiUnavailable = true`
- Computes final status using only deterministic results (`determineFinalStatus(validationResults, null)`)
- Saves the claim normally
- Appends a ReviewHistory entry noting AI was unavailable

The Claim Review page shows a yellow notice: "AI review was unavailable at submission time." All deterministic check results are still shown. The reviewer can still take all actions.

---

## 15. Reviewer Override

A reviewer who disagrees with the AI's category suggestion can use the Override Classification action. They must select a new category from a dropdown and provide a written reason — both fields are required. Silent overrides are not allowed.

The override is recorded in ReviewHistory with `action: 'OVERRIDE'` and `metadata: { previousCategory, newCategory }`. The claim's `category` field is updated to the new category, and `overriddenCategory` + `overrideReason` are stored for audit purposes.

On the Claim Review page, an overridden classification shows a blue "Reviewer Override Applied" banner indicating what changed and why.

---

## 16. Status Decision Logic

The `determineFinalStatus` function in `policyService.js` applies checks in priority order:

```
Missing required fields or invalid date  → NEEDS_REVIEW
Amount exceeds policy limit              → NON_COMPLIANT
Duplicate claim detected                 → NEEDS_REVIEW
Receipt missing / business purpose       → NEEDS_CLARIFICATION
AI confidence < 60%                      → NEEDS_REVIEW
AI finding is NON_COMPLIANT              → NON_COMPLIANT
AI finding is NEEDS_CLARIFICATION        → NEEDS_CLARIFICATION
AI finding is NEEDS_REVIEW               → NEEDS_REVIEW
All checks pass + confidence ≥ 60%       → COMPLIANT
```

This is deterministic. The AI can influence the outcome through its `finding` and `confidence` fields, but it cannot override a hard failure.

After a reviewer acts (approve/reject), the status changes to APPROVED or REJECTED regardless of the previous finding.

---

## 17. Security and Environment Variables

- `GEMINI_API_KEY` lives in `server/.env` only. The React frontend never receives it.
- `MONGODB_URI` similarly stays on the server.
- The Vite proxy (`/api/*` → backend) means the frontend never makes cross-origin requests in development, and in production the `VITE_API_URL` env var points to the deployed backend.
- `.gitignore` excludes all `.env` files.
- Input validation runs on both the frontend (form) and backend (validator + controller) to prevent invalid data reaching the database.
- Error responses from the backend return a clean `{ error: "..." }` message — stack traces are only logged on the server.

---

## 18. Deployment Architecture

```
                    ┌─────────────────────────────────────────┐
                    │   Render Static Site                    │
                    │   https://expense-policy-reviewer       │
                    │         .onrender.com                   │
                    │   VITE_API_URL →                        │
                    └──────────────────┬──────────────────────┘
                                       │ HTTPS
                    ┌──────────────────▼──────────────────────┐
                    │   Render Web Service                    │
                    │   https://expense-policy-reviewer-api   │
                    │         .onrender.com                   │
                    │   GEMINI_API_KEY                        │
                    │   MONGODB_URI                           │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │   MongoDB Atlas                         │
                    │   expense-policy cluster                │
                    └─────────────────────────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │   Google Gemini API                     │
                    │   gemini-2.5-flash (free tier)          │
                    └─────────────────────────────────────────┘
```

The frontend is a static build — zero server cost. The backend is a small Node.js process — fits comfortably on a free tier. MongoDB Atlas has a free tier sufficient for this application.

---

## 19. Important Tradeoffs

**Synchronous AI call at submission**  
The current implementation calls Gemini synchronously during the POST /api/claims request. This means the response time includes the Gemini API call (typically 1–3 seconds). For a production system with high claim volume, this should be moved to a background job queue (e.g. BullMQ). For an assessment prototype it is acceptable and keeps the architecture simple.

**Self-reported receipt**  
Whether a receipt is available is a checkbox — there is no actual file upload or OCR. In production, receipt images would be uploaded and potentially processed. This was explicitly excluded from scope.

**Single reviewer, no auth**  
There is no login system. All actions are attributed to a generic "Reviewer" actor. In production, JWT auth would identify the actual reviewer and enable role-based access (e.g. only finance managers can approve large claims).

**Policy managed in DB, not code**  
Policy rules are in MongoDB. This is intentional — it allows updating limits without a code deploy. The tradeoff is that policy changes are not version-controlled unless the database is. For this assessment, the seed script serves as the policy definition source of truth.

---

## 20. Interview Questions and Answers

**Q: Why did you use AI in this application?**

A: Expense claim descriptions are unstructured natural language. "Dinner at Taj" could be a personal meal or client entertainment. A rule engine cannot make that distinction reliably. AI is well-suited to classifying ambiguous text and identifying what information is missing from a description. It also generates the human-readable explanation that helps reviewers understand a finding quickly.

---

**Q: Why not let Gemini decide everything — the category, the limit check, everything?**

A: Financial policy limits and business rules must be deterministic. An LLM is probabilistic — it might occasionally say ₹5,200 is within a ₹5,000 limit, or miss a duplicate, or miscount a date. These errors would be serious in a financial context. Code is 100% reliable for these checks. The LLM handles language understanding; the code enforces rules.

---

**Q: How do you prevent the AI from hallucinating policy rules?**

A: Three ways. First, the AI receives the actual policy text from the database in every prompt — it is not asked to recall policy from training data. Second, its output is structured JSON with a fixed schema and validated field values; anything outside the allowed set is rejected. Third, deterministic checks are authoritative — the `determineFinalStatus` function in code makes the final call, not the AI.

---

**Q: What happens if the Gemini API goes down?**

A: The claim is still saved. Deterministic validation runs normally and determines the status. The AI fields are left null and `aiUnavailable` is set to true. The Claim Review page shows a notice that AI was unavailable. The reviewer can still read the policy check results and make a decision. The application never crashes due to an AI failure.

---

**Q: How does duplicate detection work?**

A: It queries MongoDB for an existing claim with the same claimant, the same calendar date, the same amount, and the same category. If one is found, the duplicate check fails with a message including the existing claim's ID. The UI shows a warning banner with a link to the original. The duplicate is flagged for NEEDS_REVIEW rather than automatically rejected — there could be a legitimate reason for two similar claims.

---

**Q: Why store validation results on the Claim document rather than computing them fresh each time?**

A: The validation result at submission time is the definitive finding — it reflects the state of the claim when it was submitted. If a reviewer views the claim later, they should see exactly what the system found at submission, not a re-computed result that might differ if policy data changed. It also makes the claim document self-contained for audit purposes.

---

**Q: How is the final status determined?**

A: By a deterministic function in `policyService.js` that applies checks in priority order. Hard failures (missing fields, invalid dates, amount over limit, duplicate) are evaluated first. Then soft failures (missing receipt, missing business purpose) produce NEEDS_CLARIFICATION. Then AI signals (low confidence or AI-flagged finding) produce NEEDS_REVIEW. If everything passes, the claim is COMPLIANT. The AI cannot override a hard failure.

---

**Q: Why is the AI prompt split into system instruction and user prompt?**

A: The system instruction sets the model's persistent role and constraints — it tells the model what it is, what rules it must follow, and what format to use. This applies to every claim. The user prompt provides the claim-specific data: claim fields, policy text, and validation results. Separating them is cleaner and keeps the per-claim prompt focused on data rather than re-stating instructions.

---

**Q: Why `gemini-1.5-flash` instead of `gemini-1.5-pro`?**

A: Flash is significantly faster and cheaper, and the task is relatively straightforward — classification plus explanation. Pro-level reasoning is not needed. For an expense review tool, low latency matters more than marginal accuracy gains on this type of structured task.

---

**Q: What would you change if this were going to production?**

A: At minimum: add JWT authentication with reviewer roles, move Gemini calls to a background queue to avoid blocking the HTTP request, add file upload for receipt images, implement pagination more rigorously, add rate limiting to the API, and set up proper monitoring and error alerting. The data model and business logic would not need significant changes.

---

**Q: How would you test the AI integration?**

A: The deterministic validation engine is unit-tested with Jest and can be tested completely offline. For the AI service, I would write integration tests that mock the Gemini client and assert that the prompt contains the correct claim and policy data, that the response is correctly parsed, and that the fallback path is triggered when Gemini throws. End-to-end testing of actual Gemini responses would be done manually against the seeded sample claims.

---

**Q: Why are policies stored in MongoDB rather than a config file?**

A: A config file would require a code deployment to update policy limits. Storing policies in MongoDB means an admin can update limits through the database (or a future admin UI) without touching code. The seed script in `server/src/config/policyData.js` acts as the source of truth for the initial policy set.

---

**Q: What is the purpose of the ReviewHistory model?**

A: It is the audit trail. Every action — submission, system review, approval, rejection, clarification request, override — creates an immutable record with who did it, when, what changed, and why. This makes the system fully auditable and allows building timeline views. In a regulated finance environment, this kind of audit log is essential.

---

**Q: How does the frontend handle API errors?**

A: The `api.js` service throws a proper `Error` with the message from the API response whenever the HTTP status is not OK. Pages use local `error` state to display error messages. The Claim Review page uses the `useToast` hook so action errors appear as non-blocking toast notifications. Form submissions disable buttons during loading and show inline error messages.

---

**Q: Could this be extended to support multiple organisations with different policies?**

A: Yes. The Policy model would need an `organisationId` field, and claims would reference their organisation. The policy lookup and validation logic would filter by organisation. With authentication in place, each user session would carry an organisation context. The AI prompt would receive the organisation-specific policy text exactly as it does now.
