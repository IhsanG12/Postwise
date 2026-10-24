# Postwise — web

Next.js 16 app, TypeScript, App Router. This is the whole stack — UI and API
routes in one project, no separate backend service.

```
app/          pages and UI
app/api/      API routes — the backend. Secrets, DB access, AI provider calls.
lib/          server-side helpers: AI generation, Supabase client, auth
components/   shared UI components
mockup/       index.html — approved visual + behavioral reference (not the app)
```

## Before coding

Read `../CLAUDE.md` and `../docs/api-contract.md` first. The contract
doc is the source of truth for every request/response shape — if a shape needs
to change, edit the contract doc first, then code both sides to match.

## Rules

- **Never call an AI provider from client-side code.** Only the client calls
  our own `/api/...` endpoints; only `app/api/` and `lib/` call Gemini,
  Pollinations, Stripe, etc.
- **Never hardcode API keys.** They live in `.env` only (gitignored) — never in
  source, never shipped to the browser.
- **No caption/hashtag/sound/image generation logic in the UI** — render what
  the job returns. (Drawing slide text onto a download in `lib/download.ts` is
  presentation, not generation.)
- **Run tests and lint before committing:** `npm test`, `npm run lint`.
- **Generation is async:** create job → return `jobId` → client polls
  `GET /api/generations/{jobId}` until `status: "complete"`. Never block a
  request on a long-running generation.

## Design tokens

Off-white background `#FAFAF7`, near-black text `#0B0B0C`, one champagne
accent `#B8945F`. Inter for UI, Instrument Serif (italic) for the hero word
only. Full reference: `mockup/index.html`.
