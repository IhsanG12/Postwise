# CLAUDE.md — Postwise

Standing instructions for all Claude Code sessions in this repo. Read this and
`docs/api-contract.md` at the start of every session.

## What we're building
Postwise turns a creator's one-sentence brief ("5 study tips that got me
through finals week") into a ready-to-post TikTok or Instagram post: slides
that look like one shoot (or a short clip), on-screen text for each slide,
caption options, hashtags and sound suggestions. Users pick a platform and a
format, optionally upload a selfie (or go faceless), and describe the post.

It is a **content tool for personal creators** (students, study, fitness,
cooking, travel, day-in-my-life pages). Sell ease and good-looking, useful
posts — never money, income, or real-world success.

(This project began as "Larp AI", a luxury-lifestyle generator. The original
brief is in `docs/v1-product-brief.md` for history only.)

## Repo structure
- `/web` — Next.js (React) app. Both frontend UI and backend API routes live here (Next.js architecture).
  - `/web/app/` — pages and UI. **Frontend dev's territory.**
  - `/web/app/api/` — API routes (the backend). **Backend dev's territory.**
  - `/web/lib/` — server-side helpers, AI generation, DB client. **Backend dev's territory.**
- `/planning` — session prompts, TODO, STATUS, and migration SQL. Not runnable code.
- `/docs/api-contract.md` — the contract between frontend and backend. Source of truth
  for all request/response shapes. **Change this doc first, then code.**

## Stack
- Frontend: Next.js (React), TypeScript. Styling matches the approved design
  (clean/minimal, off-white + near-black + one champagne accent; Inter +
  Instrument Serif for the hero word).
- Backend: serverless API routes / functions. Holds all secrets.
- AI providers (backend only): a text model that plans each post from the
  brief (`web/lib/generation/plan.ts`), image generation, and short video
  generation. Chosen/swapped behind the backend.

## Architecture rules — DO NOT BREAK
1. **Frontend never calls an AI provider directly.** It only calls our own
   `/api/...` endpoints. All model calls happen in the backend.
2. **API keys live only in backend environment variables.** Never in frontend
   code, never committed to git, never shipped to the browser. Use `.env` and
   keep it gitignored.
3. **All endpoints conform to `docs/api-contract.md`.** Same field names,
   same shapes. If a change is needed, edit the contract doc first.
4. **Generation is async**: create job → return jobId → client polls until
   complete. Don't make the client wait on one long request.
5. **The post plan drives everything.** Slides, slide text, captions, hashtags
   and the sound vibe all come from one plan made in the backend job. Model
   output is validated before use (`parsePlan`); if the model fails, fall back
   to a usable plan, but never paper over a refusal. Frontend has no
   caption/hashtag/sound logic — it renders what the job returns.

## Product safety rules — DO NOT BREAK
6. **Selfies are the user's own face**, used only to generate their content, then
   deleted. Enforce temporary storage + deletion on the backend. Frontend shows
   the privacy note. Do not build features to upload other people's faces or
   impersonate real, identifiable individuals — the planner refuses briefs
   about other real people.
7. **No real brand logos / trademarks** in generated assets, slide text or
   captions.
8. **No fake financial documents / receipts / dashboards / earnings
   screenshots.** The planner refuses these briefs.
9. **No earnings or income claims** anywhere in UI copy or marketing.
10. **Refusals reach the creator.** A refused brief fails the job with a
    readable reason and refunds the credit; it is never silently replaced
    with a different post.

## Coordination
- One shared git repo. Commit small, push often, pull before you start.
- The contract doc is the law; code follows the doc.
- When unsure whether something crosses a safety rule above, stop and flag it
  rather than guessing.
