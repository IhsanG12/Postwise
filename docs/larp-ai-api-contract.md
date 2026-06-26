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
  "count": 6                      // images for slideshow; ignored for video
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
