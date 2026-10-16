# FlareFix

**Find the fault. Fix the flare.**

FlareFix is an AI-powered troubleshooting assistant for Cloudflare Workers. You paste in an error, logs, or Wrangler config, and it tells you what likely went wrong, suggests a minimal fix, links the official Cloudflare docs, and gives you a verification checklist.

## The problem

When a Cloudflare Worker fails — a deploy breaks, a request throws a 500, a binding is missing — developers usually copy error messages into a search engine, dig through forums, and guess at a fix. It is slow, and it is easy to apply the wrong change to production.

## The solution

FlareFix turns a raw error into a structured, evidence-based diagnosis:

1. **Validate** the input (bounded size, allowed file types).
2. **Classify** the incident (runtime, deployment, configuration, module resolution, authorization, performance, or unknown).
3. **Extract evidence** from logs and stack traces — and redact secrets like tokens and passwords.
4. **Ask the AI** (Cloudflare Workers AI, Llama 3.3) for a probable cause, confidence level, alternatives, and a minimal fix.
5. **Link official docs** from `developers.cloudflare.com` (and honestly says so if a page could not be fetched).
6. **Give a verification plan** — a step can only be marked "passed" if you record proof.

Everything is clearly separated into facts, hypotheses, suggestions, and verified results. FlareFix never claims it accessed your live Cloudflare account.

## Features

- Email/password accounts — each user sees only their own incidents.
- AI diagnosis powered by Cloudflare Workers AI (configurable model).
- Live retrieval of official Cloudflare documentation.
- Voice input (speech-to-text) and spoken answers (text-to-speech), with full text fallback.
- Incident history saved in MongoDB.
- Secret redaction, input validation, rate limiting, security headers, and signed HttpOnly sessions.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript |
| Styling | Plain CSS (dark, responsive UI) |
| AI | Cloudflare Workers AI — `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| Database | MongoDB (users + incidents) |
| Auth | bcrypt password hashing + signed session cookies |
| Validation | Zod |
| Tests | Vitest |

## Project structure

```
app/            Next.js routes, pages, and API endpoints
  api/auth/     signup, login, logout, me
  api/incidents incident create / list / update
components/     Dashboard and auth UI
lib/
  ai/           Workers AI integration
  auth.ts       session cookies
  db/           MongoDB connection
  diagnostics/  classify, extract evidence, retrieve docs, diagnose
  repositories/ users and incidents data access
  validation.ts input schemas
workers/        separate Cloudflare Agent worker (Durable Object)
tests/          unit tests
```

## Getting started

Requires Node.js 22+, npm, and a running MongoDB (local `mongodb://localhost:27017` or MongoDB Atlas).

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env
```

Set these in `.env`:

```ini
FLAREFIX_SESSION_SECRET=<a long random string>
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=flarefix
CLOUDFLARE_ACCOUNT_ID=<your account id>
CLOUDFLARE_API_TOKEN=<token with Workers AI: Edit>
WORKERS_AI_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
```

> Where to get the Cloudflare values: Account ID is on the **Workers & Pages** page of the Cloudflare dashboard. Create the API token under **My Profile → API Tokens → Create Token → Custom Token** with permission **Account → Workers AI → Edit**.

```bash
# 3. Run it
npm run dev
```

Open `http://localhost:3000`, sign up, and submit an incident.

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # run unit tests
```

## How to use

1. Sign up with an email and password.
2. Describe what happened (optionally paste logs and Wrangler config, or use voice input).
3. Click **Analyze incident**.
4. Read the diagnosis: cause, confidence, suggested fix, and official docs.
5. Work through the verification checklist and record proof for each step you complete.

## Notes

- Without Cloudflare credentials, FlareFix still works using a deterministic rule-based diagnosis. Adding the credentials enables the AI model.
- The `workers/flarefix-agent` folder contains a separate Cloudflare Agent (Durable Object) worker for stateful session coordination. It is optional and runs independently from the main app.
