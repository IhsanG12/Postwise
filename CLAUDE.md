# CLAUDE.md — Larp AI

Standing instructions for all Claude Code sessions in this repo. Read this and
`docs/larp-ai-api-contract.md` at the start of every session.

## What we're building
Larp AI is a web app (mobile app later) that makes "larp" content — fun,
aspirational, AI-generated luxury photos and short videos for social media.
Users pick a platform (Instagram or TikTok), pick a format (slideshow or short
video), optionally upload a selfie (or go faceless), and get a ready-to-post set
of images/clips plus caption ideas and trending-sound suggestions.

It is an **entertainment / lifestyle content tool**. Positioning is fun and
self-aware ("everyone's larping, we made it good"), never a promise of money,
income, or real-world success.

## Repo structure
- `/web` — Next.js (React) app. Both frontend UI and backend API routes live here (Next.js architecture).
  - `/web/app/` — pages and UI. **Frontend dev's territory.**
  - `/web/app/api/` — API routes (the backend). **Backend dev's territory.**
  - `/web/lib/` — server-side helpers, AI generation, DB client. **Backend dev's territory.**
- `/planning` — session prompts, TODO, STATUS, and migration SQL. Not runnable code.
- `/docs/larp-ai-api-contract.md` — the contract between frontend and backend. Source of truth
  for all request/response shapes. **Change this doc first, then code.**

## Stack
- Frontend: Next.js (React), TypeScript. Styling matches the approved design
  (clean/minimal, off-white + near-black + one champagne accent; Inter +
  Instrument Serif for the hero word).
- Backend: serverless API routes / functions. Holds all secrets.
- AI providers (backend only): image generation, short video generation, and a
  text model for captions. Chosen/swapped behind the backend.

## Architecture rules — DO NOT BREAK
1. **Frontend never calls an AI provider directly.** It only calls our own
   `/api/...` endpoints. All model calls happen in the backend.
2. **API keys live only in backend environment variables.** Never in frontend
   code, never committed to git, never shipped to the browser. Use `.env` and
   keep it gitignored.
3. **All endpoints conform to `docs/larp-ai-api-contract.md`.** Same field names,
   same shapes. If a change is needed, edit the contract doc first.
4. **Generation is async**: create job → return jobId → client polls until
   complete. Don't make the client wait on one long request.
5. **Captions and sounds are generated in the backend**, inside the generation
   job, informed by what was actually generated + the platform. Frontend has no
   caption/sound logic — it renders what the job returns.

## Product safety rules — DO NOT BREAK
6. **Selfies are the user's own face**, used only to generate their content, then
   deleted. Enforce temporary storage + deletion on the backend. Frontend shows
   the privacy note. Do not build features to upload other people's faces or
   impersonate real, identifiable individuals.
7. **No real brand logos / trademarks** in generated assets. Generic luxury
   (a supercar, a watch) is fine; no badges, no brand names baked into prompts or
   scene labels in marketing.
8. **Any currency must be obvious prop money**, not a faithful reproduction of
   real banknotes.
9. **No fake financial documents / receipts / dashboards.** Generate fictional
   aspirational scenes; never alter a user's real financial document.
10. **No earnings or income claims** anywhere in UI copy or marketing. Sell fun,
    ease, and good-looking content — not money or success.

## Coordination
- One shared git repo. Commit small, push often, pull before you start.
- The contract doc is the law; code follows the doc.
- When unsure whether something crosses a safety rule above, stop and flag it
  rather than guessing.
