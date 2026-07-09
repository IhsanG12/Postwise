# Larp AI — Backend Build Plan

Work through these phases in order. Check off as you go.

---

## Phase 0 — Setup (Day 1)

- [x] Clone repo: `git clone https://github.com/IhsanG12/larp_ai.git`
- [x] Run the "Session 1" prompt (see PROMPTS.md)
- [x] Set up `.env` file (never commit this)
- [x] Add `.env` to `.gitignore`
- [x] Sign up for Gemini API → get key → add to `.env`
- [x] ~~Sign up for Higgsfield API → get key → add to `.env`~~ — never integrated; switched to Replicate instead (see Phase 3), key removed from `.env`
- [x] Sign up for Replicate API → get key → add to `.env`
- [x] Set up Stripe account → get test keys → add to `.env`

---

## Phase 1 — Backend Foundation (Days 1–2)

- [x] Decide: API routes inside Next.js (`/web/app/api`) OR separate `/backend` Node server
- [x] Set up basic project structure
- [x] Install dependencies (see Session 2 prompt)
- [x] Connect to a database (Supabase recommended — free, easy)
- [x] Create `users` table with: id, email, plan, credits, rerolls_remaining
- [x] Set up auth (NextAuth or Supabase Auth)
- [x] Verify `.env` loads correctly

---

## Phase 2 — Core API Endpoints (Days 2–4)

### GET /api/me

- [x] Returns user id, plan, credits, rerolls_remaining, unlimited
- [x] Protected (must be logged in)
- [x] Test with Postman or curl

### POST /api/uploads

- [x] Accept multipart/form-data with `file` field
- [x] Validate it's an image
- [x] Store temporarily (Supabase Storage or S3)
- [x] Return `{ uploadId, expiresInSeconds: 600 }`
- [x] Schedule deletion after 10 min

### POST /api/generations

- [x] Validate request body (platform, format, withFace, selfieUploadId, count)
- [x] Check user credits → return 402 if insufficient
- [x] Deduct 1 credit
- [x] Create job record in DB with status: "processing"
- [x] Return `{ jobId, status: "processing", estimatedSeconds: 20, creditsCharged: 1 }` immediately
- [x] Kick off background job (see Phase 3)

### GET /api/generations/:jobId

- [x] Look up job in DB
- [x] Return current status + progress if processing
- [x] Return full assets/captions/sounds if complete
- [x] Return error shape if failed

### POST /api/generations/:jobId/assets/:assetId/reroll

- [x] Check rerolls_remaining → 402 if none left
- [x] Deduct 1 reroll
- [x] Kick off single asset regeneration in background
- [x] Return `{ assetId, status: "processing", creditsCharged: 1, rerollsRemaining }`

---

## Phase 3 — AI Integration (Days 4–7)

### Image Generation (Gemini)

- [x] Write prompt builder: takes `platform`, `format`, `sceneTag`, `withFace` → builds Gemini prompt
- [x] Call image API for each image (Pollinations flux-pro — swap to Gemini when billing enabled)
- [x] Upload result to CDN (Supabase Storage)
- [x] Save CDN URL + thumbUrl to DB
- [x] Set `sceneTag` on each asset

### Video Generation (Replicate — switched from Higgsfield, never integrated)

- [x] Write Replicate API wrapper (`lib/generation/video.ts`, polls prediction until succeeded/failed)
- [x] Handle longer processing time (video takes longer than images)
- [x] Store video URL on completion
- [ ] Video reroll (currently `rerollable: false` — only image reroll is wired up)
- [ ] Real per-clip timing observed, `estimatedSeconds` for video corrected from its current placeholder

### Caption Generation

- [x] After images done, collect all `sceneTag`s from the job
- [x] Call text model with: platform + sceneTags → generate captions with tone labels
- [x] Store captions array in job record (live via Gemini, hardcoded fallback only on API failure)

### Sound Suggestions

- [x] Hardcode a curated list of trending sounds per platform to start
- [x] Later: make dynamic based on sceneTag

### Background Job Runner

- [x] Use async functions (simple, no queue needed for now)
- [x] Update job `status` and `progress` in DB as steps complete
- [x] Handle failures gracefully → set `status: "failed"`, `retryable: true`

---

## Phase 4 — Payments (Days 7–9)

- [x] Stripe webhook endpoint: `/api/webhooks/stripe`
- [x] Handle `checkout.session.completed` → upgrade user plan + add credits
- [x] Handle `customer.subscription.deleted` → downgrade to free (logs for now, needs stripe_customer_id in DB)
- [x] Create checkout session endpoint: `POST /api/billing/checkout`
- [x] Plans: Clipper (free), Larper, Pro Larper
- [x] Credit amounts per plan (Larper: 50 credits, Pro: unlimited)

---

## Phase 5 — Polish & Launch (Days 9–14)

- [ ] Rate limiting on all endpoints
- [ ] Error logging (use Sentry free tier)
- [x] Make sure selfie files are actually deleted after generation
- [ ] Deploy to Vercel (connect GitHub repo → auto deploys)
- [ ] Add production env vars to Vercel dashboard
- [ ] Test full flow end-to-end with Ihsan
- [ ] Switch Stripe from test keys to live keys
- [ ] Go live on larpai.app

---

## Database Schema (Supabase / Postgres)

```sql
-- Users (extends Supabase Auth)
users: id, email, plan, credits, rerolls_remaining, unlimited, created_at

-- Generation Jobs
jobs: id, user_id, status, progress, platform, format, with_face,
      selfie_upload_id, count, created_at, completed_at, error

-- Assets
assets: id, job_id, type, url, thumb_url, width, height,
        scene_tag, rerollable, created_at

-- Captions
captions: id, job_id, text, tone

-- Sounds
sounds: id, job_id, title, meta, platform, open_url

-- Uploads (temp)
uploads: id, user_id, url, expires_at, deleted_at
```
