# Postwise — API Contract (v0.2)

This is the agreement between **frontend** and **backend**. The frontend only ever
calls these endpoints — never an AI provider directly. Keys and model calls live
behind the backend. Build each side against this; the frontend can develop fully
against mocked responses before the backend is live.

Base URL: `/api`
All requests/responses are JSON unless noted. Auth via session cookie or
`Authorization: Bearer <token>` (decide with backend; frontend just attaches it).

---

## Core flow (generation is asynchronous)

1. `POST /api/generations` → returns a `jobId` immediately (does NOT wait).
2. `GET  /api/generations/{jobId}` → poll every ~2s until `status: "complete"`.
3. Render `assets`, `captions`, `sounds` from the completed job.
4. Per-image redo: `POST /api/generations/{jobId}/assets/{assetId}/reroll` → poll same job.

---

## 1. Create a generation

`POST /api/generations`

Request:
```json
{
  "platform": "instagram",        // "instagram" | "tiktok"
  "format": "slideshow",          // "slideshow" | "video"
  "withFace": true,               // false = faceless mode (skip selfie)
  "selfieUploadId": "upl_abc123", // required if withFace=true, else null
  "count": 6,                     // images for slideshow; ignored for video
  "brief": "5 study tips that got me through finals week" // what the post is about, 8–400 chars
}
```

Response `202 Accepted`:
```json
{
  "jobId": "gen_9f2a",
  "status": "processing",
  "estimatedSeconds": 20,
  "creditsCharged": 1
}
```

Notes:
- Selfie is uploaded separately first (see §4) so this request stays small JSON.
- Backend decides credit cost by format (slideshow cheap, video premium).
- If user lacks credits → `402` with `{ "error": "insufficient_credits" }`.
- `brief` is required. It's the creator's own description of the post. The
  backend turns it into a **post plan** (one text-model call): a title, a
  shared visual look, one scene + on-screen text per slide, captions,
  hashtags and a sound vibe. Every image in the job is generated from that
  plan, so a slideshow reads as one post instead of unrelated pictures.
- Briefs that break the safety rules in `CLAUDE.md` (a real person other than
  the user, brand logos, fake receipts or earnings) aren't rejected here —
  the planner decides, and the job fails with `brief_rejected` (see §2). The
  credit is refunded.
- Too short / too long brief → `400 { "error": "invalid_request" }`.
- `estimatedSeconds` differs by format: slideshow scales with `count`
  (~50s/image observed against the current image provider); video uses a
  flat placeholder (currently 90s) since real Replicate generation timings
  haven't been observed in production yet — expect this to need the same
  "watch real behavior, then correct" pass the slideshow estimate already got.
- Video generation (backend: `lib/generation/video.ts`, via Replicate) takes
  meaningfully longer per job than a single slideshow image — it's one
  video-model prediction that's polled to completion, not a handful of
  fast image calls in parallel.

---

## 2. Poll a generation

`GET /api/generations/{jobId}`

While running → `200`:
```json
{ "jobId": "gen_9f2a", "status": "processing", "progress": 0.5 }
```

When done → `200`:
```json
{
  "jobId": "gen_9f2a",
  "status": "complete",
  "platform": "instagram",
  "format": "slideshow",
  "post": {
    "brief": "5 study tips that got me through finals week",
    "title": "Finals week survival",
    "hashtags": ["studytok", "finalsweek", "studytips"]
  },
  "assets": [
    {
      "id": "ast_01",
      "type": "image",                 // "image" | "video"
      "url": "https://cdn.example.com/u/ast_01.jpg",
      "thumbUrl": "https://cdn.example.com/u/ast_01_t.jpg",
      "width": 1080, "height": 1350,
      "sceneTag": "slide_01",          // position in the plan; assets are sorted by it
      "slideText": "5 things that saved my finals", // on-screen text for this slide (slide 1 = the hook), null for video
      "rerollable": true
    }
  ],
  "captions": [
    { "id": "cap_1", "text": "saving this for every exam season", "tone": "relatable" },
    { "id": "cap_2", "text": "tip 3 is the one nobody talks about", "tone": "curious" }
  ],
  "sounds": [
    {
      "id": "snd_1",
      "title": "No One Noticed — The Marías",
      "meta": "dreamy",
      "platform": "instagram",
      "openUrl": "https://www.instagram.com/reels/audio/..." // opens in-app
    }
  ]
}
```

Failure → `200` with `{ "status": "failed", "error": "generation_failed", "retryable": true, "brief": "..." }`.

Brief rejected by the planner → `200` with
`{ "status": "failed", "error": "brief_rejected", "message": "Postwise can't make posts about other real people.", "retryable": false, "brief": "..." }`.
`brief` is echoed back so the frontend can send the user back to edit it.

KEY POINT: `captions`, `hashtags`, slide text and `sounds` all come from the job's
post plan, which is built from the brief + the platform. They change every
generation. Frontend just renders these arrays — no client-side caption logic.

For `format: "video"`, `assets` is always a single-element array: one
`type: "video"` asset (a real generated clip, `url` pointing at an mp4 — not
a still image). `thumbUrl` is `null` for video assets today (no frame
extraction yet); the frontend renders a native `<video>` element rather than
falling back to an `<img>` with `thumbUrl || url`, since the latter would try
to render an mp4 URL as an image. `rerollable` is always `false` for video
assets — reroll (§3) isn't implemented for video yet, only for images.

---

## 3. Reroll a single asset

`POST /api/generations/{jobId}/assets/{assetId}/reroll`

Response `202`:
```json
{ "assetId": "ast_04", "status": "processing", "creditsCharged": 1, "rerollsRemaining": 4 }
```

Then poll `GET /api/generations/{jobId}` again; the asset with that `id` will have a
new `url` once `status` is back to `complete`. A reroll redraws **the same slide**
of the plan (same scene and slide text, new image), so the post stays consistent. (Optionally backend exposes
`GET /api/generations/{jobId}/assets/{assetId}` to poll just the one asset.)

If out of rerolls → `402 { "error": "no_rerolls_remaining" }`.

---

## 4. Upload a selfie (only when withFace=true)

`POST /api/uploads`  — `multipart/form-data`, field `file`.

Response `201`:
```json
{ "uploadId": "upl_abc123", "expiresInSeconds": 600 }
```

Notes:
- Backend validates it's an image, runs any safety checks, stores temporarily.
- Per our policy: this is the **user's own face**, used only for generation,
  deleted after. Backend enforces retention; frontend shows the privacy note.
- `uploadId` is what you pass to `POST /api/generations`.

---

## 5. Account / credits (for the nav indicator)

`GET /api/me`
```json
{
  "userId": "usr_1",
  "plan": "free",                 // "free" | "creator" | "pro"
  "credits": 7,
  "rerollsRemaining": 5,
  "unlimited": false
}
```

---

## 6. Upgrade / billing checkout

`POST /api/billing/checkout`

Request:
```json
{
  "plan": "creator"               // "creator" | "pro"
}
```

Response `200`:
```json
{
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

Notes:
- Frontend redirects the browser to `checkoutUrl` (`window.location.href`) — it
  never talks to Stripe directly.
- On success, Stripe redirects the browser to `/pricing/success`. On cancel,
  back to `/pricing`.
- Actual plan/credit upgrade happens via the webhook below, not this response —
  don't flip any UI to "upgraded" until `GET /api/me` reflects the new plan.

---

## 7. Stripe webhook (backend-only, not called by the frontend)

`POST /api/webhooks/stripe`

Called directly by Stripe, never by the frontend. Verifies the `stripe-signature`
header against `STRIPE_WEBHOOK_SECRET` and updates the user's `plan`/`credits`/
`unlimited` in the database on `checkout.session.completed` (and clears them back
to free on `customer.subscription.deleted`). Frontend involvement is limited to
polling `GET /api/me` afterward to see the update land.

Response `200`:
```json
{ "received": true }
```

Failure (bad/missing signature) → `400`:
```json
{ "error": "missing_signature" }
```
or
```json
{ "error": "invalid_signature" }
```

---

## 8. Generation history

`GET /api/generations?limit=20&offset=0`

Lists the user's past generations, most recent first. `limit` (default 20, max 50)
and `offset` (default 0) are optional query params.

Response `200`:
```json
{
  "jobs": [
    {
      "jobId": "gen_9f2a",
      "status": "complete",          // "processing" | "complete" | "failed"
      "platform": "instagram",
      "format": "slideshow",
      "count": 6,
      "withFace": false,
      "createdAt": "2026-07-04T14:03:35.026Z",
      "brief": "5 study tips that got me through finals week",
      "thumbUrl": "https://cdn.example.com/u/ast_01_t.jpg"  // null if no asset yet
    }
  ],
  "hasMore": false
}
```

Notes:
- `thumbUrl` is the earliest-generated asset's thumbnail for that job, or `null`
  if the job failed before producing any asset.
- Frontend links each row to `/results/{jobId}?platform=...&format=...` (same
  page used right after generation completes).
- Frontend also offers "Regenerate" per row, which pre-fills the home picker
  via `/?platform=...&format=...&withFace=...&brief=...` — it does NOT reuse the
  original `selfieUploadId` (selfies are deleted after use, see §4), so a
  `withFace: true` row sends the user to re-upload before generating.

---

## 9. Manage billing (Stripe Customer Portal)

`POST /api/billing/portal`

For a user who already has a Stripe subscription. Opens Stripe's hosted portal
where they can update payment method, view invoices, change plan, or cancel —
none of that UI is built by us.

No request body.

Response `200`:
```json
{ "portalUrl": "https://billing.stripe.com/p/session/..." }
```

If the user has never subscribed (no Stripe customer on file) → `400`:
```json
{ "error": "no_billing_account", "message": "No billing account yet — subscribe to a plan first." }
```

Notes:
- Frontend redirects the browser to `portalUrl` (`window.location.href`), same
  pattern as `checkoutUrl` in §6.
- Stripe returns the user to `/billing` when they're done in the portal.

---

## 10. Delete a generation

`DELETE /api/generations/{jobId}`

Permanently deletes a job and everything tied to it (assets, captions, sounds,
and their storage objects). Irreversible — frontend should confirm before
calling this.

Response `200`:
```json
{ "deleted": true }
```

If the job doesn't exist or belongs to another user → `404`:
```json
{ "error": "not_found" }
```

---

## Error shape (all endpoints)

```json
{ "error": "machine_code", "message": "Human-readable, shown if useful." }
```
Common codes: `insufficient_credits`, `no_rerolls_remaining`, `invalid_upload`,
`generation_failed`, `brief_rejected`, `unauthorized`, `rate_limited`.

---

## Frontend states to handle (maps to the mockup)

- creating job → show shimmer skeletons (`POST` in flight + first polls)
- per-asset reroll → shimmer just that tile
- complete → render assets + captions + sounds
- failed/retryable → inline "Generation hiccuped — try again" with retry button
- 402 credits/rerolls → upgrade prompt
- empty selfie on withFace → block "generate" until upload returns an uploadId

## Things deliberately NOT in the frontend
- No API keys, ever.
- No direct calls to Gemini / video / text models.
- No caption, hashtag, slide-text or sound logic — those arrive in the job response.
- No image storage logic — backend returns CDN URLs.
