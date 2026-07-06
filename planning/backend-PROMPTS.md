# Claude Code Prompts — Larp AI Backend

Copy-paste these into Claude Code in order. Each one is a full session.
Always start a new session with the session prompt before doing anything else.

---

## SESSION 1 — Orientation (run this first, ever)

Read CLAUDE.md and docs/larp-ai-api-contract.md fully.

Then explore the entire repo and give me:

1. What my friend has built on the frontend so far (pages, components, what's connected)
2. What API endpoints he's already mocking or calling
3. What's missing before the frontend can actually run against a real backend
4. What environment variables will be needed
5. Your recommended folder structure for the backend

Don't write any code yet. Just give me a full picture of where we are.

---

## SESSION 2 — Project Setup

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Set up the backend project inside this repo. We're using Next.js API routes (TypeScript)
so the backend lives in /web/app/api — no separate server.

Do the following:

1. Create the folder structure for all API routes matching the contract:
   - /api/me
   - /api/uploads
   - /api/generations
   - /api/generations/[jobId]
   - /api/generations/[jobId]/assets/[assetId]/reroll
   - /api/webhooks/stripe
2. Install required packages: @supabase/supabase-js, stripe, next, typescript
3. Create a .env.example file with all required keys (no real values):
   - SUPABASE_URL
   - SUPABASE_SERVICE_KEY
   - GEMINI_API_KEY
   - HIGGSFIELD_API_KEY
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - NEXTAUTH_SECRET
4. Create a /lib/supabase.ts client helper
5. Create a /lib/auth.ts helper that gets the current user from session
6. Add stub handlers to every API route that return { ok: true } for now

Make sure .env is in .gitignore.

---

## SESSION 3 — Database Schema

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Create the Supabase database schema for Larp AI. Write a SQL migration file
at /backend/migrations/001_initial_schema.sql with these tables:

- users: id (uuid), email, plan (free/larper/pro), credits (int),
  rerolls_remaining (int), unlimited (bool), created_at
- jobs: id (uuid), user_id, status (processing/complete/failed),
  progress (float), platform, format, with_face (bool),
  selfie_upload_id, count (int), error (text), created_at, completed_at
- assets: id, job_id, type (image/video), url, thumb_url,
  width, height, scene_tag, rerollable (bool), created_at
- captions: id, job_id, text, tone
- sounds: id, job_id, title, meta, platform, open_url
- uploads: id, user_id, url, expires_at, deleted_at

Add Row Level Security policies so users can only see their own data.
Also write the TypeScript types for all these tables in /lib/types.ts.

---

## SESSION 4 — GET /api/me

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Build the GET /api/me endpoint. It should:

1. Get the current user from the session (use /lib/auth.ts)
2. Return 401 if not logged in
3. Query the users table in Supabase for their plan, credits, rerolls_remaining, unlimited
4. Return exactly this shape:
   { "userId": "usr_1", "plan": "free", "credits": 7, "rerollsRemaining": 5, "unlimited": false }

Write a test I can run with curl to verify it works.

---

## SESSION 5 — POST /api/uploads

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Build the POST /api/uploads endpoint. It should:

1. Accept multipart/form-data with a field named "file"
2. Validate it's an image (jpg, png, webp only) — return 400 if not
3. Check file size max 10MB — return 400 if too large
4. Upload to Supabase Storage bucket called "selfies"
5. Save a record to the uploads table with expires_at = now + 10 minutes
6. Return 201: { "uploadId": "upl_xxx", "expiresInSeconds": 600 }
7. Return 401 if not logged in

Important per our safety rules: these are the user's own face only,
stored temporarily, deleted after generation. Add a comment in the code
noting this and make sure the expiry is enforced.

Also write a cleanup function in /lib/cleanup.ts that deletes expired uploads
from both Supabase Storage and the uploads table. We'll call this on a schedule later.

---

## SESSION 6 — POST /api/generations (create job)

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Build the POST /api/generations endpoint. It should:

1. Validate the request body:
   - platform: "instagram" | "tiktok"
   - format: "slideshow" | "video"
   - withFace: boolean
   - selfieUploadId: string if withFace=true, else null
   - count: number (only matters for slideshow)
2. Return 401 if not logged in
3. Check user credits — if 0, return 402: { "error": "insufficient_credits" }
4. Deduct 1 credit from the user
5. Create a job record in DB with status: "processing", progress: 0
6. Return 202 immediately:
   { "jobId": "gen_xxx", "status": "processing", "estimatedSeconds": 20, "creditsCharged": 1 }
7. After returning, call startGenerationJob(jobId) — stub this function for now

Don't await the background job — return 202 first.

---

## SESSION 7 — AI Image Generation (Gemini)

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Build the image generation logic in /lib/generation/images.ts.

It should:

1. Accept: jobId, platform, format, withFace, selfieUploadId, count
2. Build a Gemini prompt for each image:
   - Aspirational luxury lifestyle content
   - Instagram aspect ratio: 1080x1350. TikTok: 1080x1920
   - If withFace=false: faceless luxury scenes (cars, watches, locations,
     private jets, penthouse views, designer items — NO real brand logos)
   - If withFace=true: composite the selfie into the luxury scene
   - Never include real brand logos or trademarks
   - Never include faithful reproductions of real currency
   - Assign a sceneTag to each image (e.g. "supercar_night", "penthouse_view")
3. Call the Gemini API for each image
4. Upload result to Supabase Storage bucket "generations"
5. Create a thumbnail (resize to 400px wide)
6. Save each asset to the assets table
7. Update job progress as each image completes

Then in /lib/generation/captions.ts:

- After all images done, collect all sceneTags
- Call a text model: platform + sceneTags → generate 4 captions with tones:
  understated, aspirational, humorous, mysterious
- Save to captions table

For sounds, hardcode 3 trending-style suggestions per platform in
/lib/generation/sounds.ts and save to sounds table.

Finally set job status to "complete" and completed_at to now.
Wrap all of this in try/catch — on failure set status: "failed", retryable: true.

---

## SESSION 8 — GET /api/generations/:jobId

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Build the GET /api/generations/[jobId] polling endpoint. It should:

1. Return 401 if not logged in
2. Return 404 if job doesn't belong to this user
3. If processing: return { jobId, status: "processing", progress }
4. If complete: return the full shape:
   {
   jobId, status: "complete", platform, format,
   assets: [ { id, type, url, thumbUrl, width, height, sceneTag, rerollable } ],
   captions: [ { id, text, tone } ],
   sounds: [ { id, title, meta, platform, openUrl } ]
   }
5. If failed: return { status: "failed", error: "generation_failed", retryable: true }

Field names must match the contract EXACTLY (camelCase as shown above).

---

## SESSION 9 — Reroll endpoint

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Build POST /api/generations/[jobId]/assets/[assetId]/reroll:

1. Return 401 if not logged in
2. Return 404 if job or asset doesn't belong to this user
3. Check rerolls_remaining — if 0 return 402: { "error": "no_rerolls_remaining" }
4. Deduct 1 reroll from user
5. Kick off regeneration for just that one asset (reuse single-image logic from SESSION 7)
6. Return 202: { "assetId": "ast_04", "status": "processing", "creditsCharged": 1, "rerollsRemaining": N }

Client keeps polling GET /api/generations/[jobId] — when the asset url updates they'll see it.

---

## SESSION 10 — Stripe Payments

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Set up Stripe payments. Plans: Clipper (free), Larper, Pro Larper.

1. Create POST /api/billing/checkout:
   - Takes { plan: "larper" | "pro" }
   - Creates a Stripe Checkout session
   - Returns { checkoutUrl } for frontend to redirect to
2. Create POST /api/webhooks/stripe:
   - Verify Stripe webhook signature
   - On checkout.session.completed:
     - Update user plan in DB
     - Larper: add 50 credits. Pro: set unlimited = true
   - On customer.subscription.deleted:
     - Downgrade to free, credits = 0

All billing goes through Stripe properly — never fake or bypass credits.
Use Stripe test mode keys for now.

---

## SESSION 11 — Integration test with frontend

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Friend's frontend is connecting to the real backend now. Let's verify everything works.

1. Check the browser network tab for every API call the frontend makes
2. Verify each endpoint matches the contract field names exactly
3. Fix any mismatches on the backend (contract is source of truth)
4. Make sure CORS is configured so frontend can call the API
5. Test the full flow:
   - Sign up / log in
   - /api/me returns correctly
   - Upload selfie → get uploadId
   - POST /api/generations → get jobId
   - Poll until complete
   - Assets/captions/sounds render in the UI
6. List and fix any bugs found

---

## SESSION 12 — Pre-launch checklist

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Prepare for launch. Go through each item:

1. Rate limiting — max 10 req/min per user on all endpoints
2. Input validation — every endpoint validates inputs, returns proper error shapes, never 500s on bad input
3. Selfie deletion — verify uploads are deleted after generation, add a log line when it happens
4. Secrets check — no hardcoded keys anywhere, all in .env
5. Error logging — console.error on all catch blocks with enough context to debug
6. Deploy to Vercel — list all env vars I need to add in the Vercel dashboard
7. Give me a curl test for each endpoint to run against the production URL

---

## ANYTIME — Stuck on a bug

Read CLAUDE.md and docs/larp-ai-api-contract.md.

I'm getting this error:
[PASTE ERROR HERE]

This happens when I:
[DESCRIBE WHAT YOU WERE DOING]

The relevant code is in:
[FILE PATH]

Find the bug and fix it. Explain what was wrong in one sentence.

---

## ANYTIME — Add a new scene type

Read CLAUDE.md and docs/larp-ai-api-contract.md.

Add a new larp scene type called "[SCENE NAME]" (e.g. "yacht_deck", "private_jet_cabin").

1. Add the sceneTag to /lib/generation/scenes.ts
2. Write a Gemini prompt for this scene:
   - Fits luxury/aspirational aesthetic
   - Works for Instagram and TikTok aspect ratios
   - No real brand logos or trademarks
3. Make sure it's selectable in the generation flow if we expose scene selection later
