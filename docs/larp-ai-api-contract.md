# Larp AI — API Contract (v0.1)

This is the agreement between **frontend** and **backend**. The frontend only ever
calls these endpoints — never an AI provider directly. Keys and model calls live
behind the backend. Build each side against this; the frontend can develop fully
against mocked responses before the backend is live.

Base URL: `/api`
All requests/responses are JSON unless noted. Auth via session cookie or
`Authorization: Bearer <token>` (decide with backend; frontend just attaches it).

---

## Core flow (generation is asynchronous)

1. `GET  /api/styles` → user picks a style package for the slideshow.
2. `POST /api/generations` → returns a `jobId` immediately (does NOT wait).
3. `GET  /api/generations/{jobId}` → poll every ~2s until `status: "complete"`.
4. Render `assets`, `captions`, `sounds` from the completed job.
5. Per-image redo: `POST /api/generations/{jobId}/assets/{assetId}/reroll` → poll same job.

---

## 0. List style packages

`GET /api/styles`

Public — no auth required, safe to call before login (used on the home picker).

Response `200`:
```json
{
  "styles": [
    {
      "id": "golden_mediterranean",
      "name": "Golden Mediterranean",
      "description": "Warm golden hour, coastal luxury",
      "previewEmoji": "🌅"
    }
  ]
}
```

Notes:
- Only `id`, `name`, `description`, `previewEmoji` are ever returned. Each
  style package also has a backend-only `promptSuffix` (plus `colorGrade`,
  `mood`, `timeOfDay`, `cameraStyle`, `settingFamily`) that never leaves the
  server — it's injected into every image prompt in the job so the whole
  slideshow reads as one consistent shoot. Frontend has no style logic beyond
  showing the picker and passing the chosen `id` along.
- No DB — this is a static, hardcoded list (`lib/generation/styles.ts`).

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
  "styleId": "golden_mediterranean" // required for slideshow (see §0); ignored for video
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
- `styleId` must be one of the ids from `GET /api/styles`. Missing or unknown
  `styleId` on a `slideshow` request → `400 invalid_request`. Ignored (not
  validated, not required) when `format` is `"video"`.
- Reroll (§3) reuses the job's original `styleId` automatically — a rerolled
  asset stays visually consistent with the rest of the set.

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
  "assets": [
    {
      "id": "ast_01",
      "type": "image",                 // "image" | "video"
      "url": "https://cdn.larpai.app/u/ast_01.jpg",
      "thumbUrl": "https://cdn.larpai.app/u/ast_01_t.jpg",
      "width": 1080, "height": 1350,
      "sceneTag": "supercar_night",    // what it is — drives caption relevance
      "rerollable": true
    }
  ],
  "captions": [
    { "id": "cap_1", "text": "Just another Tuesday 🤍", "tone": "understated" },
    { "id": "cap_2", "text": "POV: the grind paid off", "tone": "aspirational" }
  ],
  "sounds": [
    {
      "id": "snd_1",
      "title": "luxury ambient (sped up)",
      "meta": "trending · +340% this week",
      "platform": "instagram",
      "openUrl": "https://www.instagram.com/reels/audio/..." // opens in-app
    }
  ]
}
```

Failure → `200` with `{ "status": "failed", "error": "generation_failed", "retryable": true }`.

KEY POINT: `captions` and `sounds` are generated **inside this job**, informed by the
`sceneTag`s of the assets actually produced + the platform. They change every
generation. Frontend just renders these arrays — no client-side caption logic.

---

## 3. Reroll a single asset

`POST /api/generations/{jobId}/assets/{assetId}/reroll`

Response `202`:
```json
{ "assetId": "ast_04", "status": "processing", "creditsCharged": 1, "rerollsRemaining": 4 }
```

Then poll `GET /api/generations/{jobId}` again; the asset with that `id` will have a
new `url` once `status` is back to `complete`. (Optionally backend exposes
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
  "plan": "free",                 // "free" | "larper" | "pro"
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
  "plan": "larper"                // "larper" | "pro"
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
      "thumbUrl": "https://cdn.larpai.app/u/ast_01_t.jpg"  // null if no asset yet
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
  via `/?platform=...&format=...&withFace=...` — it does NOT reuse the
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
`generation_failed`, `unauthorized`, `rate_limited`.

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
- No caption or sound logic — those arrive in the job response.
- No image storage logic — backend returns CDN URLs.
