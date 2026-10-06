# Agent Usage

This document describes how AI tooling was used during development of the Expense Claim Policy Review Assistant.

---

## Tool Used

Kiro (AI-powered development environment built on VS Code) was used throughout the build. It has access to file editing, terminal execution, web search, and code analysis tools.

---

## How It Was Used

The agent was given the full problem specification and built the application in stages: project scaffolding, MongoDB models, deterministic validation engine, Express API, Gemini integration, React frontend, seed data, documentation, and deployment config.

The agent wrote the initial implementation for every file. I reviewed the output at each stage, ran the application, checked behaviour against the spec, and directed changes where needed.

---

## Representative Prompts

- "Build the complete application from the spec above — all 12 stages, no stopping for confirmation"
- "Remove all Gemini test dummy names, keep only real seeded data"
- "Fix CORS — the frontend on Render is being blocked"
- "The Gemini key format is AQ. not AIza — fix the auth approach"
- "Deploy to Render"
- "Fix the README, make it not look AI generated"

---

## Delegated Work

The agent handled all file creation and editing, dependency installation, git commits and pushes, MongoDB seed script execution, API testing via PowerShell, and Render deployment configuration.

I made decisions on architecture (keep it simple, no background queues, no auth for this prototype), directed the AI integration design (deterministic checks authoritative, AI advisory only), and verified every stage by running the application and checking actual API responses.

---

## Agent Mistakes and Corrections

**Gemini API key format** — The agent initially used the `@google/generative-ai` SDK expecting an `AIza` key. When the actual keys from Google AI Studio came back as `AQ.` (OAuth2 token format), the agent tried several wrong approaches — Bearer token auth, service account JWT signing — before landing on the correct approach: passing the `AQ.` key directly via the `x-goog-api-key` header to the Gemini REST API.

**Model name** — The agent initially used `gemini-1.5-flash` which was no longer available on the project. Had to update to `gemini-2.5-flash` after getting a 404 from the API.

**Service account blocked** — The agent attempted to use a service account JSON for auth after the API key approach failed. Gemini explicitly blocks service account access — this approach was abandoned.

**Seed script output** — The agent used `console.log` in the seed script but PowerShell swallowed stdout. The agent fixed this by redirecting output to a file to verify the seed ran correctly.

**CORS on Render** — The agent initially set CORS to read only from `CLIENT_URL` env var. Since that wasn't set on Render at deploy time, the frontend was blocked. Fixed by hardcoding the production frontend URL as a fallback in the allowed origins list.

---

## Verification

Each stage was verified by actually running the code:

- Backend syntax checked with `node --input-type=module --check`
- API endpoints tested with `Invoke-RestMethod` against both local and production URLs
- Seed script output captured to a file and read back to confirm correct data
- Frontend built with `vite build` and dist output inspected
- Gemini integration verified by submitting a real claim and checking the `aiUnavailable: false` flag and returned classification in the response
- Deployed application tested by opening the live URL and checking the dashboard loaded with real data